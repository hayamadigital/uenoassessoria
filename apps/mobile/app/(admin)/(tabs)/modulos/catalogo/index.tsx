import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listServicos } from '@ueno/firebase/queries/servicos'
import { colors } from '@/theme'

function formatPrecoServico(sv: { preco_variavel?: boolean; preco_jpy?: number | null; preco_min_jpy?: number | null; preco_max_jpy?: number | null }) {
  if (sv.preco_variavel && sv.preco_min_jpy != null && sv.preco_max_jpy != null) {
    return `¥ ${sv.preco_min_jpy.toLocaleString()} - ¥ ${sv.preco_max_jpy.toLocaleString()}`
  }
  return sv.preco_jpy ? `¥ ${sv.preco_jpy.toLocaleString()}` : null
}

export default function CatalogoAdminScreen() {
  const { t } = useTranslation('common')

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['admin-servicos-all'],
    queryFn: () => listServicos(db, false),
  })

  const ativos = (servicos ?? []).filter((s) => s.is_active).length
  const inativos = (servicos ?? []).filter((s) => !s.is_active).length

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>{t('admin.tabs.modules')} · {t('admin.modules.catalog')}</Text>
          <Text style={s.headerTitle}>{t('admin.calendar.service')}</Text>
        </View>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={s.actionBtnTxt}>{t('new')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.statsRow}>
          {[
            { n: servicos?.length ?? 0, l: 'Total', c: '#0F766E' },
            { n: ativos, l: t('active'), c: colors.ok },
            { n: inativos, l: t('inactive'), c: colors.ink400 },
          ].map(({ n, l, c }) => (
            <View key={l} style={s.statCard}>
              <Text style={[s.statN, { color: c }]}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t('admin.modules.registered_services')}</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : (servicos ?? []).length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="layers-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>{t('admin.modules.no_services')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(servicos ?? []).map((sv) => (
              <View key={sv.id} style={s.serviceCard}>
                <View style={s.serviceIconBox}>
                  <Ionicons name="briefcase-outline" size={18} color={'#0F766E'} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.serviceRow}>
                    <Text style={s.serviceName} numberOfLines={1}>{sv.nome}</Text>
                    <View style={[s.statusChip, { backgroundColor: sv.is_active ? '#16A34A18' : colors.ink100 }]}>
                      <Text style={[s.statusChipTxt, { color: sv.is_active ? colors.ok : colors.ink400 }]}>
                        {sv.is_active ? t('active') : t('inactive')}
                      </Text>
                    </View>
                  </View>
                  {sv.descricao ? (
                    <Text style={s.serviceDesc} numberOfLines={2}>{sv.descricao}</Text>
                  ) : null}
                  <View style={s.serviceMeta}>
                    {sv.usa_variacoes ? (
                      <View style={s.priceTag}>
                        <Ionicons name="layers-outline" size={11} color={colors.navy800} />
                        <Text style={s.priceTxt}>{t('admin.modules.variations')}</Text>
                      </View>
                    ) : formatPrecoServico(sv) ? (
                      <View style={s.priceTag}>
                        <Ionicons name="cash-outline" size={11} color={colors.navy800} />
                        <Text style={s.priceTxt}>{formatPrecoServico(sv)}</Text>
                      </View>
                    ) : null}
                    {sv.duracao_texto ? (
                      <View style={s.priceTag}>
                        <Ionicons name="time-outline" size={11} color={colors.ink500} />
                        <Text style={[s.priceTxt, { color: colors.ink500 }]}>{sv.duracao_texto}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
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

  serviceCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  serviceIconBox: {
    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
    backgroundColor: '#0F766E18', alignItems: 'center', justifyContent: 'center',
  },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  serviceName: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.ink900 },
  serviceDesc: { fontSize: 11.5, color: colors.ink500, lineHeight: 16, marginBottom: 6 },
  serviceMeta: { flexDirection: 'row', gap: 8 },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceTxt: { fontSize: 11, fontWeight: '600', color: colors.navy800 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusChipTxt: { fontSize: 10, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
