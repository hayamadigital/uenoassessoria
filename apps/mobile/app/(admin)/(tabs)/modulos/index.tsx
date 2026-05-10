import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listMateriais } from '@ueno/firebase/queries/materiais'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { listAvaliacoes } from '@ueno/firebase/queries/avaliacoes'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Modulo = {
  id: string
  label: string
  sub: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
}

const MODULOS: Modulo[] = [
  { id: 'materias', label: 'Matérias', sub: 'simulados e materiais', icon: 'library-outline', color: colors.navy800 },
  { id: 'catalogo', label: 'Catálogo', sub: 'serviços disponíveis', icon: 'layers-outline', color: '#0F766E' },
  { id: 'avaliacoes', label: 'Avaliações', sub: '★ feedbacks', icon: 'star-outline', color: colors.warn },
  { id: 'faq', label: 'FAQ', sub: 'perguntas frequentes', icon: 'help-circle-outline', color: '#7E22CE' },
]

export default function ModulosAdminScreen() {
  const { data: materiais } = useQuery({
    queryKey: ['materiais-admin'],
    queryFn: () => listMateriais(db),
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos-admin'],
    queryFn: () => listServicos(db, false),
  })

  const { data: avaliacoes } = useQuery({
    queryKey: ['avaliacoes-admin-count'],
    queryFn: () => listAvaliacoes(db),
  })

  const mediaAv = avaliacoes && avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : '—'

  const moduloCounts: Record<string, { n: number; sub: string }> = {
    materias: {
      n: materiais?.length ?? 0,
      sub: `${(materiais ?? []).filter((m) => m.tipo === 'simulado').length} simulados`,
    },
    catalogo: { n: servicos?.length ?? 0, sub: 'serviços disponíveis' },
    avaliacoes: { n: avaliacoes?.length ?? 0, sub: `${mediaAv} ★ média` },
    faq: { n: 0, sub: 'perguntas frequentes' },
  }

  const recentActivity = [
    { label: 'Catálogo atualizado', desc: 'Preços revisados', time: 'há 1h', icon: 'layers-outline' as const, color: '#0F766E' },
    { label: 'Matéria revisada', desc: 'Simulados e materiais de estudo', time: 'há 3h', icon: 'library-outline' as const, color: colors.navy800 },
    { label: 'FAQ publicado', desc: 'Como agendar aula prática?', time: 'ontem', icon: 'help-circle-outline' as const, color: '#7E22CE' },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.headerSub}>Conteúdo da plataforma</Text>
          <Text style={s.headerTitle}>Módulos</Text>
        </View>

        {/* Web hint banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="globe-outline" size={20} color={colors.navy800} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Edição completa na web</Text>
            <Text style={s.bannerSub}>Crie e edite módulos no painel desktop.</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>VISÃO GERAL</Text>

        <View style={s.grid}>
          {MODULOS.map((m) => {
            const count = moduloCounts[m.id]
            return (
              <TouchableOpacity
                key={m.id}
                style={s.moduleCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/modulos/${m.id}` as any)}
              >
                <View style={s.moduleCardTop}>
                  <View style={[s.moduleIconBox, { backgroundColor: m.color + '18' }]}>
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.ink300} />
                </View>
                <Text style={s.moduleLabel}>{m.label}</Text>
                <Text style={s.moduleCount}>{count.n}</Text>
                <Text style={s.moduleSub}>{count.sub}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[s.sectionLabel, { marginTop: 4 }]}>ATIVIDADE RECENTE</Text>

        <View style={s.activityCard}>
          {recentActivity.map((r, i) => (
            <View key={i} style={[s.activityRow, i < recentActivity.length - 1 && s.activityBorder]}>
              <View style={[s.activityIcon, { backgroundColor: r.color + '18' }]}>
                <Ionicons name={r.icon} size={15} color={r.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.activityTitle}>{r.label}</Text>
                <Text style={s.activityDesc} numberOfLines={1}>{r.desc}</Text>
              </View>
              <Text style={s.activityTime}>{r.time}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  header: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.ink900, letterSpacing: -0.4, marginTop: 1 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    borderRadius: 16, padding: 14, margin: 16, marginBottom: 4,
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 13, fontWeight: '600', color: colors.ink900 },
  bannerSub: { fontSize: 11, color: colors.ink500, marginTop: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 16, marginTop: 18, marginBottom: 10,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  moduleCard: {
    width: '47.5%', backgroundColor: colors.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.ink100,
  },
  moduleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  moduleIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { fontSize: 13, fontWeight: '600', color: colors.ink700 },
  moduleCount: { fontSize: 22, fontWeight: '700', letterSpacing: -0.66, color: colors.ink900, marginTop: 2 },
  moduleSub: { fontSize: 10.5, color: colors.ink400, marginTop: 2 },

  activityCard: {
    backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.ink100,
    overflow: 'hidden', marginHorizontal: 16,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, paddingHorizontal: 14 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  activityIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 12.5, fontWeight: '600', color: colors.ink900 },
  activityDesc: { fontSize: 11, color: colors.ink500, marginTop: 1 },
  activityTime: { fontSize: 10.5, color: colors.ink400 },
})
