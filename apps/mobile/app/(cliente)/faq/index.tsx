import { ComponentProps, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listFaqs } from '@ueno/firebase/queries/faq'
import { getPublicAppConfig } from '@ueno/firebase/queries/public-config'
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

function buildWhatsAppUrl(phone: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const message = encodeURIComponent('Olá! Gostaria de falar sobre o FAQ.')
  return `https://wa.me/${digits}?text=${message}`
}

export default function FaqIndexScreen() {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const { data: publicConfig } = useQuery({
    queryKey: ['public-app-config'],
    queryFn: () => getPublicAppConfig(db),
  })

  const publishedFaqs = useMemo(() => faqs.filter((faq) => faq.is_active), [faqs])
  const whatsappUrl = buildWhatsAppUrl(publicConfig?.support_whatsapp ?? null)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Ajuda</Text>
          <Text style={s.headerTitle}>Perguntas frequentes</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.contactCard}>
          <View style={s.contactIcon}>
            <Ionicons name="logo-whatsapp" size={22} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>Fale no WhatsApp</Text>
            <Text style={s.contactText}>
              Use este contato se preferir falar direto com a equipe.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.contactBtn, !whatsappUrl && s.contactBtnDisabled]}
            activeOpacity={0.8}
            onPress={() => whatsappUrl && Linking.openURL(whatsappUrl)}
            disabled={!whatsappUrl}
          >
            <Text style={s.contactBtnTxt}>Abrir</Text>
          </TouchableOpacity>
        </View>

        {publicConfig?.support_whatsapp ? (
          <Text style={s.contactHint}>
            Número configurado: {publicConfig.support_whatsapp}
          </Text>
        ) : (
          <Text style={s.contactHint}>
            WhatsApp de suporte ainda não configurado no app web.
          </Text>
        )}

        <Text style={s.sectionLabel}>Todas as perguntas</Text>

        {isLoading ? (
          <View style={s.emptyCard}>
            <Ionicons name="hourglass-outline" size={22} color={colors.ink300} />
            <Text style={s.emptyTxt}>Carregando perguntas...</Text>
          </View>
        ) : publishedFaqs.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="help-circle-outline" size={24} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhuma pergunta publicada</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {publishedFaqs.map((faq) => {
              const iconColor = faq.cor_icone || '#7E22CE'
              return (
                <TouchableOpacity
                  key={faq.id}
                  style={s.faqCard}
                  activeOpacity={0.78}
                  onPress={() => router.push(`/(cliente)/faq/${faq.id}`)}
                >
                  <View style={[s.faqIcon, { backgroundColor: `${iconColor}18` }]}>
                    <Ionicons name={getFaqIcon(faq.icone)} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.faqTag}>FAQ</Text>
                    <Text style={s.faqQ} numberOfLines={2}>
                      {faq.pergunta}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  contactCard: {
    backgroundColor: colors.navy800,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitle: { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 3 },
  contactText: { fontSize: 12.5, color: 'rgba(255,255,255,.8)', lineHeight: 17 },
  contactBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnDisabled: { opacity: 0.45 },
  contactBtnTxt: { fontSize: 12.5, fontWeight: '700', color: colors.navy800 },
  contactHint: { fontSize: 11.5, color: colors.ink500, marginTop: 8, marginBottom: 18, paddingHorizontal: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  faqCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    borderRadius: 16,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  faqIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  faqTag: { fontSize: 9.5, color: colors.ink400, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  faqQ: { fontSize: 13.5, fontWeight: '600', color: colors.ink900, lineHeight: 18 },
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTxt: { fontSize: 12.5, color: colors.ink500 },
})
