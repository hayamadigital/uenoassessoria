import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listQuestoes } from '@ueno/firebase/queries/questoes'
import { colors } from '@/theme'
import type { QuestaoWithDetails } from '@ueno/firebase'

function questionIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function QuestaoResult({ questao }: { questao: QuestaoWithDetails }) {
  const corretas = questao.opcoes.filter((op) => op.is_correta)

  return (
    <TouchableOpacity
      style={s.resultCard}
      activeOpacity={0.84}
      onPress={() => router.push(`/modulos/materias/questoes/${questao.id}` as any)}
    >
      <View style={s.resultHeader}>
        <View style={s.idBadge}>
          <Text style={s.idBadgeTxt}>{questionIdentifier(questao.id)}</Text>
        </View>
        <Ionicons name="create-outline" size={16} color={colors.navy800} />
      </View>
      <Text style={s.questionText} numberOfLines={3}>{questao.enunciado}</Text>
      <View style={s.metaRow}>
        <View style={s.metaBadge}>
          <Text style={s.metaBadgeTxt}>
            {questao.tipo_opcao === 'booleano' ? 'V / F' : 'Múltipla escolha'}
          </Text>
        </View>
        <Text style={s.metaText}>{questao.opcoes.length} opções</Text>
      </View>
      {corretas.length > 0 && (
        <Text style={s.answerText} numberOfLines={1}>
          Resposta: {corretas.map((op) => op.texto).join(', ')}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function ConsultarQuestaoScreen() {
  const [search, setSearch] = useState('')
  const searchTerm = normalize(search)

  const { data: questoes, isLoading } = useQuery({
    queryKey: ['admin-consultar-questao', search],
    queryFn: () => listQuestoes(db, { search }),
    enabled: searchTerm.length >= 3,
  })

  const results = (questoes ?? []).filter((q) => (
    q.id.toLowerCase().includes(searchTerm) ||
    questionIdentifier(q.id).toLowerCase().includes(searchTerm) ||
    q.enunciado.toLowerCase().includes(searchTerm)
  ))

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerSub}>Matérias</Text>
          <Text style={s.headerTitle}>Consultar questão</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.ink400} />
          <TextInput
            style={s.searchInput}
            placeholder="Digite o ID ou texto da questão"
            placeholderTextColor={colors.ink400}
            autoCapitalize="characters"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.ink400} />
            </TouchableOpacity>
          )}
        </View>

        {searchTerm.length < 3 ? (
          <View style={s.empty}>
            <Ionicons name="finger-print-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTitle}>Informe pelo menos 3 caracteres</Text>
            <Text style={s.emptySub}>Use o identificador exibido no simulado ou um trecho do enunciado.</Text>
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 28 }} />
        ) : results.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTitle}>Nenhuma questão encontrada</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>RESULTADOS</Text>
            <View style={{ gap: 10 }}>
              {results.map((questao) => (
                <QuestaoResult key={questao.id} questao={questao} />
              ))}
            </View>
          </>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink900, padding: 0 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  resultCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: colors.ink100,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  idBadge: { backgroundColor: colors.navy50, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  idBadgeTxt: { fontSize: 10, fontWeight: '800', color: colors.navy800 },
  questionText: { fontSize: 13, fontWeight: '600', color: colors.ink900, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  metaBadge: { backgroundColor: colors.ink100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  metaBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.ink500 },
  metaText: { fontSize: 11, color: colors.ink400 },
  answerText: { fontSize: 11, color: '#166534', fontWeight: '600', marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink500, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.ink400, textAlign: 'center', marginTop: 4, lineHeight: 17 },
})
