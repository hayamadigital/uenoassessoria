import { useState, type ComponentProps } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { db } from '@/lib/firebase'
import { listFaqs } from '@ueno/firebase/queries/faq'
import { colors } from '@/theme'

type IoniconName = ComponentProps<typeof Ionicons>['name']

const ICON_BY_FAQ_ICON: Record<string, IoniconName> = {
  BookOpen: 'book-outline',
  Calendar: 'calendar-outline',
  Car: 'car-outline',
  Clock: 'time-outline',
  CreditCard: 'card-outline',
  FileText: 'document-text-outline',
  HelpCircle: 'help-circle-outline',
  MessageCircle: 'chatbubble-ellipses-outline',
  ShieldCheck: 'shield-checkmark-outline',
  Users: 'people-outline',
}

function getFaqIcon(icon: string): IoniconName {
  return ICON_BY_FAQ_ICON[icon] ?? 'help-circle-outline'
}

export default function FaqAdminScreen() {
  const { t } = useTranslation('common')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const publicadas = faqs.filter((f) => f.is_active).length
  const rascunhos = faqs.filter((f) => !f.is_active).length

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>{t('admin.tabs.modules')} · FAQ</Text>
          <Text style={s.headerTitle}>{t('admin.modules.frequently_asked')}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: '#7E22CE' }]}>{publicadas}</Text>
            <Text style={s.statL}>{t('admin.modules.published')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: colors.ink400 }]}>{rascunhos}</Text>
            <Text style={s.statL}>{t('admin.modules.drafts')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: colors.ok }]}>{faqs.length}</Text>
            <Text style={s.statL}>Total</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>{t('admin.modules.registered_questions')}</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : faqs.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="help-circle-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>{t('admin.modules.no_faqs')}</Text>
          </View>
        ) : (
          <View style={{ gap: 9 }}>
            {faqs.map((item) => {
              const iconColor = item.cor_icone || '#7E22CE'
              const isOpen = openFaqId === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.faqCard, !item.is_active && s.faqCardInactive]}
                  activeOpacity={0.8}
                  onPress={() => setOpenFaqId(isOpen ? null : item.id)}
                >
                  <View style={[s.faqIcon, { backgroundColor: `${iconColor}18` }]}>
                    <Ionicons name={getFaqIcon(item.icone)} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.faqTitleRow}>
                      <Text style={s.faqQ} numberOfLines={isOpen ? undefined : 2}>{item.pergunta}</Text>
                      <View style={[s.statusChip, { backgroundColor: item.is_active ? '#16A34A18' : colors.ink100 }]}>
                        <Text style={[s.statusChipTxt, { color: item.is_active ? colors.ok : colors.ink400 }]}>
                          {item.is_active ? t('active') : t('admin.modules.draft')}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.faqA} numberOfLines={isOpen ? undefined : 2}>{item.resposta}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-forward'} size={14} color={colors.ink300} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View style={s.addCard}>
          <Ionicons name="add-circle-outline" size={20} color={colors.navy800} />
          <Text style={s.addTxt}>{t('admin.modules.full_management_web')}</Text>
        </View>
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
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  statL: { fontSize: 10, color: colors.ink500 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },

  faqCard: {
    backgroundColor: colors.white, borderRadius: 13, padding: 12,
    borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', gap: 11, alignItems: 'center',
  },
  faqCardInactive: { opacity: 0.62 },
  faqIcon: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    backgroundColor: '#7E22CE18', alignItems: 'center', justifyContent: 'center',
  },
  faqTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 3 },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink900 },
  faqA: { fontSize: 11.5, color: colors.ink500, lineHeight: 16 },
  statusChip: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  statusChipTxt: { fontSize: 9.5, fontWeight: '600' },
  empty: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 13, padding: 24, alignItems: 'center', gap: 8,
  },
  emptyTxt: { fontSize: 12.5, color: colors.ink500 },

  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    borderRadius: 13, padding: 14, marginTop: 12,
  },
  addTxt: { flex: 1, fontSize: 12.5, color: colors.ink700, lineHeight: 17 },
})
