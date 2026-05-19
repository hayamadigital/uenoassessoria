import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listMateriais } from '@ueno/firebase/queries/materiais'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { listAvaliacoes } from '@ueno/firebase/queries/avaliacoes'
import { listFaqs } from '@ueno/firebase/queries/faq'
import { colors } from '@/theme'

type Modulo = {
  id: string
  labelKey: string
  subKey: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
}

const MODULOS: Modulo[] = [
  { id: 'materias', labelKey: 'admin.modules.materials', subKey: 'admin.modules.materials_sub', icon: 'library-outline', color: colors.navy800 },
  { id: 'catalogo', labelKey: 'admin.modules.catalog', subKey: 'admin.modules.catalog_sub', icon: 'layers-outline', color: '#0F766E' },
  { id: 'avaliacoes', labelKey: 'admin.modules.reviews', subKey: 'admin.modules.reviews_sub', icon: 'star-outline', color: colors.warn },
  { id: 'faq', labelKey: 'admin.modules.faq', subKey: 'admin.modules.faq_sub', icon: 'help-circle-outline', color: '#7E22CE' },
  { id: 'financeiro', labelKey: 'admin.modules.finance', subKey: 'admin.modules.finance_sub', icon: 'wallet-outline', color: '#0891B2' },
]

export default function ModulosAdminScreen() {
  const { t } = useTranslation('common')

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

  const { data: faqs } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const mediaAv = avaliacoes && avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : '—'

  const faqsPublicadas = (faqs ?? []).filter((f) => f.is_active).length

  const moduloCounts: Record<string, { n: number; sub: string }> = {
    materias: {
      n: materiais?.length ?? 0,
      sub: t('admin.modules.simulated_count', { count: (materiais ?? []).filter((m) => m.tipo === 'simulado').length }),
    },
    catalogo: { n: servicos?.length ?? 0, sub: t('admin.modules.catalog_sub') },
    avaliacoes: { n: avaliacoes?.length ?? 0, sub: t('admin.modules.average_rating', { rating: mediaAv }) },
    faq: { n: faqs?.length ?? 0, sub: t('admin.modules.published_count', { count: faqsPublicadas }) },
    financeiro: { n: 0, sub: t('admin.modules.finance_sub') },
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.headerSub}>{t('admin.modules.platform_content')}</Text>
          <Text style={s.headerTitle}>{t('admin.tabs.modules')}</Text>
        </View>

        {/* Web hint banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="globe-outline" size={20} color={colors.navy800} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{t('admin.modules.web_editing_title')}</Text>
            <Text style={s.bannerSub}>{t('admin.modules.web_editing_sub')}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>{t('admin.modules.overview')}</Text>

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
                <Text style={s.moduleLabel}>{t(m.labelKey)}</Text>
                <Text style={s.moduleCount}>{count.n}</Text>
                <Text style={s.moduleSub}>{count.sub}</Text>
              </TouchableOpacity>
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

})
