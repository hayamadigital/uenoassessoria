import { useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { db } from '@/lib/firebase'
import { listCategoriasMaterial, listMateriais } from '@ueno/firebase/queries/materiais'
import { listQuestoes } from '@ueno/firebase/queries/questoes'
import { colors } from '@/theme'
import type { CategoriaMaterial, Material, QuestaoWithDetails, TipoMaterial } from '@ueno/firebase'

const TIPO_COLOR: Record<TipoMaterial, string> = {
  pdf: '#0891B2',
  video: colors.err,
  link: '#7E22CE',
  texto: '#0F766E',
  simulado: colors.navy800,
}

const TIPO_ICON: Record<TipoMaterial, keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text-outline',
  video: 'videocam-outline',
  link: 'link-outline',
  texto: 'reader-outline',
  simulado: 'book-outline',
}

const TIPO_LABEL: Record<TipoMaterial, string> = {
  pdf: 'PDF',
  video: 'Video',
  link: 'Link externo',
  texto: 'Texto',
  simulado: 'Simulado',
}

type CategoriaGrupo = {
  categoria: CategoriaMaterial | null
  materiais: Material[]
}

function questionIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function QuestionCard({ questao, index }: { questao: QuestaoWithDetails; index: number }) {
  const corretas = questao.opcoes.filter((op) => op.is_correta)

  return (
    <View style={s.questionCard}>
      <View style={s.questionHeader}>
        <View style={s.questionNumBox}>
          <Text style={s.questionNum}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.questionId}>ID {questionIdentifier(questao.id)}</Text>
          <Text style={s.questionText}>{questao.enunciado}</Text>
        </View>
      </View>

      <View style={s.answerList}>
        {questao.opcoes.map((op) => (
          <View key={op.id} style={[s.answerRow, op.is_correta && s.answerRowCorrect]}>
            <Ionicons
              name={op.is_correta ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={op.is_correta ? '#16A34A' : colors.ink300}
            />
            <Text style={[s.answerText, op.is_correta && s.answerTextCorrect]}>{op.texto}</Text>
          </View>
        ))}
      </View>

      {corretas.length > 0 && (
        <Text style={s.correctSummary} numberOfLines={2}>
          Resposta: {corretas.map((op) => op.texto).join(', ')}
        </Text>
      )}
      {questao.explicacao && (
        <Text style={s.explanation} numberOfLines={4}>
          {questao.explicacao}
        </Text>
      )}
    </View>
  )
}

export default function MateriasAdminScreen() {
  const [search, setSearch] = useState('')

  const { data: materiais, isLoading: loadingMateriais } = useQuery({
    queryKey: ['admin-materias-list'],
    queryFn: () => listMateriais(db),
  })

  const { data: categorias, isLoading: loadingCategorias } = useQuery({
    queryKey: ['admin-materias-categorias'],
    queryFn: () => listCategoriasMaterial(db),
  })

  const { data: questoesEncontradas, isLoading: loadingBusca } = useQuery({
    queryKey: ['admin-materias-questoes-search', search],
    queryFn: () => listQuestoes(db, { search }),
    enabled: normalize(search).length >= 3,
  })

  const isLoading = loadingMateriais || loadingCategorias
  const searchTerm = normalize(search)
  const searchResults = (questoesEncontradas ?? []).filter((q) => {
    if (!searchTerm) return false
    return q.id.toLowerCase().includes(searchTerm) || questionIdentifier(q.id).toLowerCase().includes(searchTerm)
  })

  const grupos = useMemo<CategoriaGrupo[]>(() => {
    const cats = categorias ?? []
    const mats = materiais ?? []
    const result: CategoriaGrupo[] = cats.map((categoria) => ({
      categoria,
      materiais: mats.filter((m) => m.categoria_id === categoria.id),
    }))
    const semCategoria = mats.filter((m) => !m.categoria_id || !cats.some((c) => c.id === m.categoria_id))
    if (semCategoria.length > 0) result.push({ categoria: null, materiais: semCategoria })
    return result.filter((grupo) => grupo.materiais.length > 0)
  }, [categorias, materiais])

  const totals = {
    simulados: (materiais ?? []).filter((m) => m.tipo === 'simulado').length,
    materiais: (materiais ?? []).filter((m) => m.tipo !== 'simulado').length,
    categorias: grupos.length,
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Módulos · Matérias</Text>
          <Text style={s.headerTitle}>Simulados e materiais</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.ink400} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar questão pelo identificador"
            placeholderTextColor={colors.ink400}
            autoCapitalize="characters"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {searchTerm.length >= 3 && (
          <View style={s.searchResults}>
            <Text style={s.sectionLabel}>QUESTÕES ENCONTRADAS</Text>
            {loadingBusca ? (
              <ActivityIndicator color={colors.navy800} style={{ marginVertical: 16 }} />
            ) : searchResults.length === 0 ? (
              <View style={s.emptySmall}>
                <Text style={s.emptyTxt}>Nenhuma questão com esse identificador</Text>
              </View>
            ) : (
              <View style={{ gap: 9 }}>
                {searchResults.map((q, index) => (
                  <QuestionCard key={q.id} questao={q} index={index} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={s.statsRow}>
          {[
            { n: totals.simulados, l: 'Simulados', c: colors.navy800 },
            { n: totals.materiais, l: 'Materiais', c: '#0F766E' },
            { n: totals.categorias, l: 'Categorias', c: '#0891B2' },
          ].map(({ n, l, c }) => (
            <View key={l} style={s.statCard}>
              <Text style={[s.statN, { color: c }]}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>CONTEÚDO POR CATEGORIA</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : grupos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="library-outline" size={32} color={colors.ink300} />
            <Text style={s.emptyTxt}>Nenhuma matéria cadastrada</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {grupos.map((grupo) => (
              <View key={grupo.categoria?.id ?? 'sem-categoria'} style={s.categoryBlock}>
                <Text style={s.categoryTitle}>{grupo.categoria?.nome ?? 'Sem categoria'}</Text>
                {grupo.categoria?.descricao ? (
                  <Text style={s.categoryDesc} numberOfLines={2}>{grupo.categoria.descricao}</Text>
                ) : null}

                <View style={{ gap: 9, marginTop: 10 }}>
                  {grupo.materiais.map((m) => {
                    const c = TIPO_COLOR[m.tipo]
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={s.materialCard}
                        activeOpacity={0.82}
                        onPress={() => router.push(`/modulos/materias/${m.id}` as any)}
                      >
                        <View style={[s.materialIcon, { backgroundColor: c + '18' }]}>
                          <Ionicons name={TIPO_ICON[m.tipo]} size={18} color={c} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.materialTitle} numberOfLines={1}>{m.titulo}</Text>
                          <View style={s.materialMeta}>
                            <View style={[s.typeBadge, { backgroundColor: c + '18' }]}>
                              <Text style={[s.typeBadgeTxt, { color: c }]}>{TIPO_LABEL[m.tipo]}</Text>
                            </View>
                            {!m.is_active && (
                              <View style={[s.typeBadge, { backgroundColor: colors.ink100 }]}>
                                <Text style={[s.typeBadgeTxt, { color: colors.ink400 }]}>Inativo</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color={colors.ink300} />
                      </TouchableOpacity>
                    )
                  })}
                </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink900, padding: 0 },
  searchResults: { marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 20, fontWeight: '700' },
  statL: { fontSize: 10, color: colors.ink500 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  detailBlock: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 16, padding: 12, marginBottom: 18,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  closeDetailBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 10, color: colors.ink400, fontWeight: '700', letterSpacing: 0.7 },
  detailTitle: { fontSize: 14, fontWeight: '700', color: colors.ink900, marginTop: 1 },
  categoryBlock: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 16, padding: 13,
  },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: colors.ink900 },
  categoryDesc: { fontSize: 11, color: colors.ink500, marginTop: 3, lineHeight: 16 },
  materialCard: {
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 13, padding: 11,
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink50,
  },
  materialIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  materialTitle: { fontSize: 13, fontWeight: '600', color: colors.ink900, marginBottom: 5 },
  materialMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  typeBadgeTxt: { fontSize: 9, fontWeight: '700' },
  questionCard: {
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 13,
    padding: 11, backgroundColor: colors.white,
  },
  questionHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  questionNumBox: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.ink50,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionNum: { fontSize: 11, fontWeight: '700', color: colors.ink700 },
  questionId: { fontSize: 10, color: colors.navy800, fontWeight: '700', marginBottom: 4 },
  questionText: { fontSize: 12.5, fontWeight: '600', color: colors.ink900, lineHeight: 18 },
  answerList: { gap: 6, marginTop: 10 },
  answerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.ink50,
  },
  answerRowCorrect: { backgroundColor: '#16A34A12', borderWidth: 1, borderColor: '#16A34A30' },
  answerText: { flex: 1, fontSize: 12, color: colors.ink500 },
  answerTextCorrect: { color: '#166534', fontWeight: '600' },
  correctSummary: { fontSize: 11, color: '#166534', fontWeight: '600', marginTop: 9 },
  explanation: { fontSize: 11, color: colors.ink500, lineHeight: 16, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptySmall: { alignItems: 'center', paddingVertical: 18, gap: 6 },
  emptyTxt: { fontSize: 13, color: colors.ink400 },
})
