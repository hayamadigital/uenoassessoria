import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listMateriais, listCategoriasMaterial, getClienteProgresso, listSimuladoQuestoes } from '@ueno/firebase/queries/materiais'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import type { TipoMaterial } from '@ueno/firebase'

const TIPO_COLOR: Record<TipoMaterial, string> = {
  pdf: colors.navy800,
  video: '#0891B2',
  link: '#0F766E',
  texto: '#7E22CE',
  simulado: colors.warn,
}

const TIPO_ICON: Record<TipoMaterial, keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text-outline',
  video: 'play-circle-outline',
  link: 'link-outline',
  texto: 'book-outline',
  simulado: 'star-outline',
}

const TIPO_LABEL: Record<TipoMaterial, string> = {
  pdf: 'PDF',
  video: 'Vídeo',
  link: 'Link',
  texto: 'Texto',
  simulado: 'Simulado',
}

type Filtro = TipoMaterial | 'todos'

export default function SimuladosScreen() {
  const { session } = useAuthStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<string | null>(null)

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: materiais, isLoading } = useQuery({
    queryKey: ['materiais', filtro],
    queryFn: () => listMateriais(db, undefined, true),
  })

  const { data: progresso } = useQuery({
    queryKey: ['progresso', cliente?.id],
    queryFn: () => getClienteProgresso(db, cliente!.id),
    enabled: !!cliente,
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias-material'],
    queryFn: () => listCategoriasMaterial(db),
  })

  const { data: questoesSimulado, isLoading: loadingQuestoesSimulado } = useQuery({
    queryKey: ['cliente-simulado-questoes', selectedSimuladoId],
    queryFn: () => listSimuladoQuestoes(db, selectedSimuladoId!),
    enabled: !!selectedSimuladoId,
  })

  const progressoMap = Object.fromEntries((progresso ?? []).map((p) => [p.material_id, p]))

  const filtered = (materiais ?? []).filter((m) => {
    const matchFiltro = filtro === 'todos' || m.tipo === filtro
    const matchBusca = busca === '' || m.titulo.toLowerCase().includes(busca.toLowerCase())
    return matchFiltro && matchBusca
  })

  // Stats from progresso
  const totalSimulados = (materiais ?? []).filter((m) => m.tipo === 'simulado').length
  const concluidosCount = (progresso ?? []).filter((p) => p.concluido).length
  const avgPct = progresso?.length
    ? Math.round(progresso.reduce((acc, p) => acc + (p.progresso_pct ?? 0), 0) / progresso.length)
    : 0

  const emAndamento = filtered.find((m) => {
    const p = progressoMap[m.id]
    return p && (p.progresso_pct ?? 0) > 0 && !p.concluido
  })

  const selectedSimulado = (materiais ?? []).find((m) => m.id === selectedSimuladoId) ?? null

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.headerRow}>
          <Text style={s.headerSub}>Estude no seu ritmo</Text>
          <Text style={s.headerTitle}>Simulados &amp; materiais</Text>
        </View>

        {/* Busca */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.ink400} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar simulado ou tema"
            placeholderTextColor={colors.ink400}
            value={busca}
            onChangeText={setBusca}
          />
        </View>

        {/* Progresso hero */}
        <View style={s.heroCard}>
          <View style={s.heroCircle} />
          <Text style={s.heroLabel}>SEU PROGRESSO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 8 }}>
            <Text style={s.heroPct}>{avgPct}%</Text>
            <Text style={s.heroSub}>de aproveitamento médio</Text>
          </View>
          <View style={s.heroStats}>
            <Text style={s.heroStat}><Text style={s.heroStatNum}>{totalSimulados}</Text> simulados</Text>
            <View style={s.heroDot} />
            <Text style={s.heroStat}><Text style={s.heroStatNum}>{concluidosCount}</Text> concluídos</Text>
          </View>
        </View>

        {/* Filtro tipo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsRow}>
          {([['todos', 'Todos'], ['simulado', 'Simulados'], ['pdf', 'PDF'], ['video', 'Vídeo'], ['texto', 'Textos']] as const).map(([v, l]) => (
            <TouchableOpacity
              key={v}
              style={[s.pill, filtro === v && s.pillActive]}
              onPress={() => setFiltro(v)}
              activeOpacity={0.8}
            >
              <Text style={[s.pillTxt, filtro === v && s.pillTxtActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Em andamento */}
        {emAndamento && (
          <>
            <Text style={s.sectionLabel}>CONTINUAR DE ONDE PAROU</Text>
            <View style={s.continueCard}>
              <View style={[s.continueIconBox, { backgroundColor: TIPO_COLOR[emAndamento.tipo] + '18' }]}>
                <Ionicons name={TIPO_ICON[emAndamento.tipo]} size={24} color={TIPO_COLOR[emAndamento.tipo]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.continueTag}>{TIPO_LABEL[emAndamento.tipo].toUpperCase()}</Text>
                <Text style={s.continueTitle} numberOfLines={2}>{emAndamento.titulo}</Text>
                <View style={{ marginTop: 8 }}>
                  <View style={s.progBarBg}>
                    <View style={[s.progBarFill, { width: `${progressoMap[emAndamento.id]?.progresso_pct ?? 0}%` }]} />
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {selectedSimulado && (
          <>
            <Text style={s.sectionLabel}>SIMULADO ABERTO</Text>
            <View style={s.simuladoDetail}>
              <View style={s.simuladoDetailHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.simuladoTitle} numberOfLines={2}>{selectedSimulado.titulo}</Text>
                  <Text style={s.simuladoHint}>Informe o ID da questão caso precise reportar correção.</Text>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedSimuladoId(null)}>
                  <Ionicons name="close" size={16} color={colors.ink500} />
                </TouchableOpacity>
              </View>

              {loadingQuestoesSimulado ? (
                <ActivityIndicator color={colors.navy800} style={{ marginVertical: 18 }} />
              ) : (questoesSimulado ?? []).length === 0 ? (
                <Text style={s.emptyInline}>Nenhuma questão vinculada a este simulado.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {(questoesSimulado ?? []).map((q, index) => (
                    <View key={q.id} style={s.questionCard}>
                      <View style={s.questionTop}>
                        <View style={s.questionNumBox}>
                          <Text style={s.questionNum}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.questionId}>ID {q.id.slice(0, 8).toUpperCase()}</Text>
                          <Text style={s.questionText}>{q.enunciado}</Text>
                        </View>
                      </View>
                      <View style={s.optionList}>
                        {q.opcoes.map((op) => (
                          <View key={op.id} style={s.optionRow}>
                            <Ionicons name="ellipse-outline" size={14} color={colors.ink300} />
                            <Text style={s.optionText}>{op.texto}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* Lista */}
        <Text style={s.sectionLabel}>MATERIAIS PARA ESTUDO</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>Nenhum material encontrado</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((m) => {
              const prog = progressoMap[m.id]
              return (
                <TouchableOpacity
                  key={m.id}
                  style={s.materialCard}
                  activeOpacity={0.8}
                  onPress={() => m.tipo === 'simulado' && setSelectedSimuladoId(m.id)}
                >
                  <View style={[s.materialIconBox, { backgroundColor: TIPO_COLOR[m.tipo] + '15' }]}>
                    <Ionicons name={TIPO_ICON[m.tipo]} size={20} color={TIPO_COLOR[m.tipo]} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.materialTitle} numberOfLines={2}>{m.titulo}</Text>
                    <Text style={s.materialMeta} numberOfLines={1}>
                      {TIPO_LABEL[m.tipo]}
                      {m.descricao ? ` · ${m.descricao}` : ''}
                    </Text>
                    {prog && (prog.progresso_pct ?? 0) > 0 && (
                      <View style={[s.progBarBg, { marginTop: 6 }]}>
                        <View style={[s.progBarFill, { width: `${prog.progresso_pct ?? 0}%` }]} />
                      </View>
                    )}
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
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  headerRow: { marginBottom: 14 },
  headerSub: { fontSize: 12, color: colors.ink500 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5, marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.ink50, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink900 },

  heroCard: {
    borderRadius: 20, padding: 16, marginBottom: 20,
    backgroundColor: colors.navy800, overflow: 'hidden',
  },
  heroCircle: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.06)' },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,.75)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroPct: { fontSize: 36, fontWeight: '700', color: 'white', letterSpacing: -1 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,.85)', paddingBottom: 5 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  heroStat: { fontSize: 11, color: 'rgba(255,255,255,.85)' },
  heroStatNum: { fontSize: 14, fontWeight: '700', color: 'white' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.4)' },

  pillsScroll: { marginBottom: 18 },
  pillsRow: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200 },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 12, fontWeight: '600', color: colors.ink700 },
  pillTxtActive: { color: 'white' },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  continueCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', gap: 12, marginBottom: 20,
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  continueIconBox: { width: 62, height: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  continueTag: { fontSize: 10, color: colors.ink400, fontWeight: '600', letterSpacing: 0.6, marginBottom: 2 },
  continueTitle: { fontSize: 14, fontWeight: '600', color: colors.ink900, lineHeight: 20 },

  progBarBg: { height: 5, borderRadius: 3, backgroundColor: colors.ink100, overflow: 'hidden' },
  progBarFill: { height: '100%', backgroundColor: colors.navy800, borderRadius: 3 },

  simuladoDetail: {
    backgroundColor: colors.white, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 20,
  },
  simuladoDetailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  simuladoTitle: { fontSize: 14, fontWeight: '700', color: colors.ink900, lineHeight: 20 },
  simuladoHint: { fontSize: 11, color: colors.ink500, marginTop: 3, lineHeight: 15 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center',
  },
  questionCard: {
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 14,
    padding: 12, backgroundColor: colors.ink50,
  },
  questionTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  questionNumBox: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionNum: { fontSize: 11, fontWeight: '700', color: colors.ink700 },
  questionId: { fontSize: 10, fontWeight: '700', color: colors.navy800, marginBottom: 4 },
  questionText: { fontSize: 12.5, fontWeight: '600', color: colors.ink900, lineHeight: 18 },
  optionList: { gap: 6, marginTop: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.white,
  },
  optionText: { flex: 1, fontSize: 12, color: colors.ink500 },
  emptyInline: { fontSize: 12, color: colors.ink400, textAlign: 'center', paddingVertical: 18 },

  materialCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 13,
    borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  materialIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  materialTitle: { fontSize: 13.5, fontWeight: '600', color: colors.ink900, lineHeight: 18, letterSpacing: -0.2 },
  materialMeta: { fontSize: 11, color: colors.ink500, marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink500 },
})
