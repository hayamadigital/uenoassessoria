import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { db } from '@/lib/firebase'
import { listFaqs } from '@ueno/firebase/queries/faq'
import { colors } from '@/theme'

export default function FaqDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const faqId = Array.isArray(params.id) ? params.id[0] : params.id

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faq'],
    queryFn: () => listFaqs(db),
  })

  const faq = faqs.find((item) => item.id === faqId)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>FAQ</Text>
          <Text style={s.headerTitle}>Pergunta</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={s.card}>
            <Text style={s.loadingTxt}>Carregando...</Text>
          </View>
        ) : faq ? (
          <View style={s.card}>
            <Text style={s.questionLabel}>Pergunta</Text>
            <Text style={s.question}>{faq.pergunta}</Text>

            <View style={s.divider} />

            <Text style={s.answerLabel}>Resposta</Text>
            <Text style={s.answer}>{faq.resposta || 'Sem resposta cadastrada.'}</Text>
          </View>
        ) : (
          <View style={s.card}>
            <Ionicons name="help-circle-outline" size={26} color={colors.ink300} />
            <Text style={s.loadingTxt}>Pergunta não encontrada.</Text>
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

  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 18,
    gap: 8,
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy700,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  question: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.45,
  },
  divider: {
    height: 1,
    backgroundColor: colors.ink100,
    marginVertical: 8,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  answer: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink700,
  },
  loadingTxt: { fontSize: 13, color: colors.ink500 },
})
