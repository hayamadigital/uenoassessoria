import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors } from '@/theme'

const FAQ_ITEMS = [
  { q: 'Como agendar uma aula prática?', a: 'Acesse o app, vá em Agenda e selecione um horário disponível com seu instrutor.' },
  { q: 'Quais documentos são necessários para a CNH?', a: 'Passaporte válido, Residence Card, CNH brasileira original e tradução juramentada.' },
  { q: 'Quanto tempo leva a transferência da CNH?', a: 'Em média 30 a 60 dias, dependendo da prefeitura e disponibilidade do departamento.' },
  { q: 'Posso fazer o simulado em português?', a: 'Sim, todos os simulados estão disponíveis em português e japonês.' },
  { q: 'Como funciona o acompanhamento ao departamento?', a: 'Nossa equipe vai com você ao departamento de trânsito para auxiliar na entrevista e documentação.' },
]

export default function FaqAdminScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Módulos · FAQ</Text>
          <Text style={s.headerTitle}>Perguntas Frequentes</Text>
        </View>
        <TouchableOpacity style={s.actionBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={s.actionBtnTxt}>Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: '#7E22CE' }]}>{FAQ_ITEMS.length}</Text>
            <Text style={s.statL}>Publicadas</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: colors.ink400 }]}>0</Text>
            <Text style={s.statL}>Rascunhos</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statN, { color: colors.ok }]}>Ativo</Text>
            <Text style={s.statL}>Status</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>PERGUNTAS CADASTRADAS</Text>

        <View style={{ gap: 9 }}>
          {FAQ_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={s.faqCard} activeOpacity={0.8}>
              <View style={s.faqIcon}>
                <Ionicons name="help-circle-outline" size={18} color="#7E22CE" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.faqQ} numberOfLines={2}>{item.q}</Text>
                <Text style={s.faqA} numberOfLines={2}>{item.a}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.ink300} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.addCard}>
          <Ionicons name="add-circle-outline" size={20} color={colors.navy800} />
          <Text style={s.addTxt}>Gerenciamento completo disponível na versão web</Text>
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
  faqIcon: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    backgroundColor: '#7E22CE18', alignItems: 'center', justifyContent: 'center',
  },
  faqQ: { fontSize: 13, fontWeight: '600', color: colors.ink900, marginBottom: 3 },
  faqA: { fontSize: 11.5, color: colors.ink500, lineHeight: 16 },

  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    borderRadius: 13, padding: 14, marginTop: 12,
  },
  addTxt: { flex: 1, fontSize: 12.5, color: colors.ink700, lineHeight: 17 },
})
