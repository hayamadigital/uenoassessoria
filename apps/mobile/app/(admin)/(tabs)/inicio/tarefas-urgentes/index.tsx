import { useState, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/firebase'
import { listEtapasPendentesAssessoria } from '@ueno/firebase/queries/etapas'
import type { EtapaPendenteItem } from '@ueno/firebase/queries/etapas'
import { colors } from '@/theme'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type FiltroStatus = 'todas' | 'atrasado' | 'em_andamento' | 'pendente'

const STATUS_CONFIG = {
  atrasado:    { label: 'Atrasado',     color: colors.err,    bg: colors.err + '12' },
  em_andamento:{ label: 'Em andamento', color: colors.warn,   bg: colors.warn + '12' },
  pendente:    { label: 'Pendente',     color: colors.navy800, bg: colors.navy50 },
  concluido:   { label: 'Concluído',    color: colors.ok,     bg: colors.ok + '12' },
}

function formatData(iso: string | null): string | null {
  if (!iso) return null
  try {
    return format(parseISO(iso), "d 'de' MMM", { locale: ptBR })
  } catch {
    return null
  }
}

export default function TarefasUrgentesScreen() {
  const [filtro, setFiltro] = useState<FiltroStatus>('todas')

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ['etapas-pendentes-assessoria'],
    queryFn: () => listEtapasPendentesAssessoria(db),
  })

  const contagens = useMemo(() => ({
    todas:       etapas.length,
    atrasado:    etapas.filter(e => e.status === 'atrasado').length,
    em_andamento:etapas.filter(e => e.status === 'em_andamento').length,
    pendente:    etapas.filter(e => e.status === 'pendente').length,
  }), [etapas])

  const filtradas = useMemo(() =>
    filtro === 'todas' ? etapas : etapas.filter(e => e.status === filtro),
    [etapas, filtro],
  )

  const FILTROS: { key: FiltroStatus; label: string }[] = [
    { key: 'todas',        label: `Todas · ${contagens.todas}` },
    { key: 'atrasado',     label: `Atrasadas · ${contagens.atrasado}` },
    { key: 'em_andamento', label: `Em andamento · ${contagens.em_andamento}` },
    { key: 'pendente',     label: `Pendentes · ${contagens.pendente}` },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Tarefas urgentes</Text>
          <Text style={s.headerSub}>Responsabilidade da assessoria</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtersScroll}
        contentContainerStyle={s.filtersContent}
      >
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filtro === f.key && s.chipActive]}
            activeOpacity={0.8}
            onPress={() => setFiltro(f.key)}
          >
            <Text style={[s.chipTxt, filtro === f.key && s.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.navy800} style={{ marginTop: 32 }} />
      ) : filtradas.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.ok} />
          <Text style={s.emptyTxt}>Nenhuma tarefa pendente</Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 9 }}>
            {filtradas.map((item) => (
              <EtapaCard key={item.id} item={item} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function EtapaCard({ item }: { item: EtapaPendenteItem }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pendente
  const dataFmt = formatData(item.data_agendada)

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/clientes/${item.cliente_id}` as any)}
    >
      <View style={[s.accent, { backgroundColor: cfg.color }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.cardTop}>
          <Text style={s.cardNome} numberOfLines={1}>{item.nome}</Text>
          {dataFmt && (
            <View style={s.dataBadge}>
              <Ionicons name="calendar-outline" size={11} color={colors.ink500} />
              <Text style={s.dataTxt}>{dataFmt}</Text>
            </View>
          )}
        </View>
        <View style={s.cardBottom}>
          <Text style={s.cardCliente} numberOfLines={1}>{item.cliente_nome}</Text>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },
  headerSub: { fontSize: 11, color: colors.ink500, marginTop: 1 },

  filtersScroll: { maxHeight: 52, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink200,
  },
  chipActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  chipTxtActive: { color: colors.white },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: colors.ink500, fontWeight: '500' },

  card: {
    backgroundColor: colors.white, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  accent: { width: 5, height: 40, borderRadius: 3, flexShrink: 0 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardNome: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink900, letterSpacing: -0.2 },
  dataBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
  dataTxt: { fontSize: 10.5, color: colors.ink500 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCliente: { fontSize: 11.5, color: colors.ink500, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginLeft: 8 },
  statusTxt: { fontSize: 10.5, fontWeight: '600' },
})
