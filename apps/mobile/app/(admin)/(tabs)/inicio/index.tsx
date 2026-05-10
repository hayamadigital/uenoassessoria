import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listClientes } from '@ueno/firebase/queries/clientes'
import { listAgendamentosByDate } from '@ueno/firebase/queries/agendamentos'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { getDashboardFinanceiro } from '@ueno/firebase/queries/financeiro'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const BAR_DATA = [40, 65, 50, 78, 62, 90, 72]
const BAR_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

const FUNIL = [
  { l: 'Contratação', c: colors.navy800 },
  { l: 'Documentação', c: colors.navy700 },
  { l: 'Análise', c: colors.navy600 },
  { l: 'Departamento', c: '#3B5BD9' },
  { l: 'Aprovação', c: '#5EEAD4' },
]

export default function AdminHomeScreen() {
  const { session } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')
  const mesAtual = format(new Date(), 'yyyy-MM')

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['admin-clientes-all'],
    queryFn: () => listClientes(db),
  })

  const { data: agendamentosHoje } = useQuery({
    queryKey: ['agendamentos-hoje', today],
    queryFn: () => listAgendamentosByDate(db, today),
  })

  const { data: finDash } = useQuery({
    queryKey: ['fin-dash', mesAtual],
    queryFn: () => getDashboardFinanceiro(db, mesAtual),
  })

  const clientesAtivos = clientes?.filter((c) => ['contato', 'documentacao', 'agendado', 'em_andamento'].includes(c.status_processo)) ?? []
  const agendHoje = agendamentosHoje?.length ?? 0
  const receitaMes = finDash?.total_pago_mes ?? 0

  const kpis = [
    { n: String(clientes?.length ?? '—'), l: 'Clientes ativos', t: `+${clientesAtivos.length} em andamento`, c: colors.navy800, icon: 'people-outline' as const },
    { n: String(clientesAtivos.length), l: 'Processos em curso', t: 'veja detalhes', c: '#0891B2', icon: 'layers-outline' as const },
    { n: String(agendHoje), l: 'Agendamentos hoje', t: 'abrir calendário', c: colors.warn, icon: 'calendar-outline' as const },
    { n: '—', l: 'Aprovações no mês', t: 'meta: 12', c: colors.ok, icon: 'checkmark-circle-outline' as const },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={s.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={s.uaBadge}><Text style={s.uaTxt}>UA</Text></View>
            <View>
              <Text style={s.topSub}>Painel administrativo</Text>
              <Text style={s.topTitle}>Olá, Equipe Ueno</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.topBtn} activeOpacity={0.7} onPress={() => router.push('/inicio/notificacoes' as any)}>
              <Ionicons name="notifications-outline" size={18} color={colors.ink700} />
              <View style={s.topBtnDot} />
            </TouchableOpacity>
            <View style={s.topBtn}>
              <Ionicons name="search-outline" size={18} color={colors.ink700} />
            </View>
          </View>
        </View>

        {/* KPI hero */}
        <View style={s.kpiHero}>
          <View style={s.kpiCircle} />
          <View style={s.kpiTopRow}>
            <View style={s.kpiMonthPill}>
              <Text style={s.kpiMonthTxt}>{format(new Date(), 'MMM yyyy', { locale: ptBR })}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="trending-up" size={12} color="rgba(255,255,255,.75)" />
              <Text style={s.kpiTrend}>+18% vs mês ant.</Text>
            </View>
          </View>
          <Text style={s.kpiLabel}>FATURAMENTO DO MÊS</Text>
          <Text style={s.kpiValue}>
            {receitaMes > 0 ? `¥ ${receitaMes.toLocaleString('ja-JP')}` : '¥ —'}
          </Text>

          {/* Mini bar chart */}
          <View style={s.barChart}>
            {BAR_DATA.map((h, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <View style={[s.bar, { height: `${h}%`, backgroundColor: i === 5 ? '#5EEAD4' : 'rgba(255,255,255,.3)' }]} />
                <Text style={s.barLabel}>{BAR_LABELS[i]}</Text>
              </View>
            ))}
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
          <Text style={s.sectionLabel}>TAREFAS URGENTES</Text>
          <TouchableOpacity><Text style={s.verTudo}>Ver tudo</Text></TouchableOpacity>
        </View>
        {loadingClientes ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
        ) : (
          <View style={{ gap: 8, marginBottom: 22 }}>
            {(clientes ?? []).slice(0, 3).map((c, i) => {
              const urgColors = [colors.err, colors.warn, '#0891B2']
              return (
                <View key={c.id} style={s.taskCard}>
                  <View style={[s.taskAccent, { backgroundColor: urgColors[i % 3] }]} />
                  <Avatar name={c.profile?.full_name ?? 'Cliente'} size={32} />
                  <View style={{ flex: 1, marginLeft: 11, minWidth: 0 }}>
                    <Text style={s.taskAction} numberOfLines={1}>Processo em andamento</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={s.taskWho} numberOfLines={1}>{c.profile?.full_name}</Text>
                      <View style={s.taskDot} />
                      <Text style={s.taskTime}>{c.cidade_jp ?? '—'}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
                </View>
              )
            })}
          </View>
        )}

        {/* Funil */}
        <Text style={s.sectionLabel}>FUNIL DE PROCESSOS</Text>
        <View style={s.funilCard}>
          {FUNIL.map((f, i) => {
            const n = clientesAtivos.length > 0 ? Math.max(1, Math.round(clientesAtivos.length * (1 - i * 0.2))) : 0
            const pct = FUNIL.length > 0 ? (1 - i * 0.18) : 1
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
  uaBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  uaTxt: { fontSize: 13, fontWeight: '700', color: 'white', letterSpacing: -0.3 },
  topSub: { fontSize: 11, color: colors.ink500 },
  topTitle: { fontSize: 15, fontWeight: '600', color: colors.ink900, letterSpacing: -0.2 },
  topBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topBtnDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white },

  kpiHero: {
    backgroundColor: colors.navy800, borderRadius: 22, padding: 18, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 8,
  },
  kpiCircle: { position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,.05)' },
  kpiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kpiMonthPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.16)' },
  kpiMonthTxt: { fontSize: 11, color: 'white', fontWeight: '500', textTransform: 'capitalize' },
  kpiTrend: { fontSize: 11, color: 'rgba(255,255,255,.75)' },
  kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' },
  kpiValue: { fontSize: 32, fontWeight: '700', color: 'white', letterSpacing: -0.8, marginTop: 3 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 16, height: 50 },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: 'rgba(255,255,255,.6)' },

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
