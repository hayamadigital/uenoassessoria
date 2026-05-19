import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listMateriais } from '@ueno/firebase/queries/materiais'
import { listQuestoes } from '@ueno/firebase/queries/questoes'
import { colors } from '@/theme'

export default function SimuladosAdminScreen() {
  const { t } = useTranslation('common')

  const { data: materiais, isLoading: loadingMat } = useQuery({
    queryKey: ['admin-simulados-list'],
    queryFn: () => listMateriais(db),
  })

  const { data: questoes, isLoading: loadingQ } = useQuery({
    queryKey: ['admin-questoes'],
    queryFn: () => listQuestoes(db),
    staleTime: 60_000,
  })

  const simulados = (materiais ?? []).filter((m) => m.tipo === 'simulado')
  const isLoading = loadingMat || loadingQ

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>{t('admin.tabs.modules')} · {t('admin.modules.tests')}</Text>
          <Text style={s.headerTitle}>{t('admin.modules.questions')}</Text>
        </View>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={s.actionBtnTxt}>{t('new')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { n: questoes?.length ?? 0, l: t('admin.modules.questions'), c: colors.navy800 },
            { n: simulados.length, l: t('admin.modules.tests'), c: '#0891B2' },
            { n: (questoes ?? []).filter((q) => (q.imagens?.length ?? 0) > 0).length, l: t('admin.modules.with_image'), c: '#0F766E' },
          ].map(({ n, l, c }) => (
            <View key={l} style={s.statCard}>
              <Text style={[s.statN, { color: c }]}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t('admin.modules.question_bank')}</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (questoes ?? []).length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="book-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>{t('admin.modules.no_questions')}</Text>
          </View>
        ) : (
          <View style={{ gap: 9 }}>
            {(questoes ?? []).map((q, i) => (
              <View key={q.id} style={s.questionCard}>
                <View style={s.questionNumBox}>
                  <Text style={s.questionNum}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.questionText} numberOfLines={3}>{q.enunciado}</Text>
                  <View style={s.questionMeta}>
                    {q.tipo_opcao === 'booleano' ? (
                      <>
                        <View style={[s.chip, { backgroundColor: '#16A34A18' }]}>
                          <Text style={[s.chipTxt, { color: '#16A34A' }]}>V / F</Text>
                        </View>
                      </>
                    ) : (
                      <View style={[s.chip, { backgroundColor: colors.navy800 + '18' }]}>
                        <Text style={[s.chipTxt, { color: colors.navy800 }]}>{t('admin.modules.multiple_choice')}</Text>
                      </View>
                    )}
                    {(q.imagens?.length ?? 0) > 0 && (
                      <View style={s.imgBadge}>
                        <Ionicons name="image-outline" size={10} color={colors.ink500} />
                        <Text style={s.imgBadgeTxt}>{t('admin.modules.with_image')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="ellipsis-vertical" size={16} color={colors.ink400} />
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
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.navy800,
  },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: colors.white },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  statL: { fontSize: 10, color: colors.ink500 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  questionCard: {
    backgroundColor: colors.white, borderRadius: 13, padding: 12,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', gap: 11, alignItems: 'flex-start',
  },
  questionNumBox: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: colors.ink50,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionNum: { fontSize: 11, fontWeight: '700', color: colors.ink700 },
  questionText: { fontSize: 12.5, fontWeight: '500', lineHeight: 18, color: colors.ink900 },
  questionMeta: { flexDirection: 'row', gap: 7, marginTop: 6, alignItems: 'center' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipTxt: { fontSize: 10, fontWeight: '600' },
  imgBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  imgBadgeTxt: { fontSize: 10, color: colors.ink500 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
