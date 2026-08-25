import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { VideoView, useVideoPlayer } from 'expo-video'
import { WebView } from 'react-native-webview'
import { db } from '@/lib/firebase'
import { AppImage } from '@/components/AppImage'
import { getMaterial, listMaterialCards, listSimuladoQuestoes } from '@ueno/firebase/queries/materiais'
import { colors } from '@/theme'
import type { MaterialCard, QuestaoWithDetails, TipoMaterial } from '@ueno/firebase'

const TIPO_COLOR: Record<TipoMaterial, string> = {
  pdf: '#0891B2',
  video: colors.err,
  link: '#7E22CE',
  texto: '#0F766E',
  simulado: colors.navy800,
  card: '#FB923C',
}

const TIPO_LABEL: Record<TipoMaterial, string> = {
  pdf: 'PDF',
  video: 'Video',
  link: 'Link externo',
  texto: 'Texto',
  simulado: 'Simulado',
  card: 'Cartão',
}

function questionIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function isDirectVideoUrl(url: string) {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url)
}

function pdfViewerUrl(url: string) {
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`
}

function DirectVideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url })

  return (
    <View style={s.videoWrap}>
      <VideoView
        player={player}
        style={s.video}
        nativeControls
        contentFit="contain"
      />
    </View>
  )
}

function QuestionCard({ questao, index }: { questao: QuestaoWithDetails; index: number }) {
  const corretas = questao.opcoes.filter((op) => op.is_correta)

  return (
    <View style={s.questionCard}>
      <View style={s.questionTop}>
        <View style={s.questionNumBox}>
          <Text style={s.questionNum}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.questionId}>ID {questionIdentifier(questao.id)}</Text>
          <Text style={s.questionText}>{questao.enunciado}</Text>
        </View>
      </View>

      <View style={s.optionList}>
        {questao.opcoes.map((op) => (
          <View key={op.id} style={[s.optionRow, op.is_correta && s.optionRowCorrect]}>
            <Ionicons
              name={op.is_correta ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={op.is_correta ? '#16A34A' : colors.ink300}
            />
            <Text style={[s.optionText, op.is_correta && s.optionTextCorrect]}>{op.texto}</Text>
          </View>
        ))}
      </View>

      {corretas.length > 0 && (
        <Text style={s.correctSummary}>Resposta: {corretas.map((op) => op.texto).join(', ')}</Text>
      )}
      {questao.explicacao && <Text style={s.explanation}>{questao.explicacao}</Text>}
    </View>
  )
}

function MaterialCardPreview({ card, index }: { card: MaterialCard; index: number }) {
  return (
    <View style={s.flashCard}>
      <View style={s.flashImageWrap}>
        <AppImage source={{ uri: card.imagem_url }} style={s.flashImage} contentFit="contain" />
      </View>
      <View style={s.flashBody}>
        <View style={s.flashMetaRow}>
          <Text style={s.flashIndex}>{index + 1}</Text>
          {card.categoria ? <Text style={s.flashCategory}>{card.categoria}</Text> : null}
        </View>
        <Text style={s.flashTitle}>{card.legenda_pt}</Text>
        {[card.legenda_kanji, card.legenda_hiragana, card.legenda_romaji].filter(Boolean).length > 0 ? (
          <Text style={s.flashReading}>
            {[card.legenda_kanji, card.legenda_hiragana, card.legenda_romaji].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {card.descricao ? <Text style={s.flashDesc}>{card.descricao}</Text> : null}
      </View>
    </View>
  )
}

export default function MateriaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: material, isLoading: loadingMaterial } = useQuery({
    queryKey: ['admin-materia-detail', id],
    queryFn: () => getMaterial(db, id!),
    enabled: !!id,
  })

  const { data: questoes, isLoading: loadingQuestoes } = useQuery({
    queryKey: ['admin-materia-simulado-questoes', id],
    queryFn: () => listSimuladoQuestoes(db, id!),
    enabled: !!id && material?.tipo === 'simulado',
  })

  const { data: cards, isLoading: loadingCards } = useQuery({
    queryKey: ['admin-materia-cards', id],
    queryFn: () => listMaterialCards(db, id!),
    enabled: !!id && material?.tipo === 'card',
  })

  if (loadingMaterial) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.navy800} style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  if (!material) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.ink700} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Material não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const typeColor = TIPO_COLOR[material.tipo]
  const url = material.url ?? ''
  const albumUrls = material.album_urls ?? []

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerSub}>Matérias · {TIPO_LABEL[material.tipo]}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{material.titulo}</Text>
        </View>
        {url ? (
          <TouchableOpacity style={s.openBtn} onPress={() => Linking.openURL(url)}>
            <Ionicons name="open-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      {material.tipo === 'pdf' && url ? (
        <WebView source={{ uri: pdfViewerUrl(url) }} style={s.webView} startInLoadingState />
      ) : material.tipo === 'link' && url ? (
        <WebView source={{ uri: url }} style={s.webView} startInLoadingState />
      ) : material.tipo === 'video' && url ? (
        isDirectVideoUrl(url) ? (
          <DirectVideoPlayer url={url} />
        ) : (
          <WebView source={{ uri: url }} style={s.webView} startInLoadingState />
        )
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {material.tipo === 'texto' && (
            <>
              {material.banner_url ? (
                <AppImage source={{ uri: material.banner_url }} style={s.banner} />
              ) : null}

              <View style={[s.typePill, { backgroundColor: typeColor + '18' }]}>
                <Text style={[s.typePillTxt, { color: typeColor }]}>{TIPO_LABEL[material.tipo]}</Text>
              </View>

              {material.descricao ? <Text style={s.description}>{material.descricao}</Text> : null}
              {material.conteudo_texto ? (
                <Text style={s.bodyText}>{material.conteudo_texto}</Text>
              ) : (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>Nenhum conteúdo de texto cadastrado.</Text>
                </View>
              )}

              {albumUrls.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>ÁLBUM</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.albumRow}>
                    {albumUrls.map((imageUrl, index) => (
                      <AppImage
                        key={`${imageUrl}-${index}`}
                        source={{ uri: imageUrl }}
                        style={s.albumImage}
                      />
                    ))}
                  </ScrollView>
                </>
              )}
            </>
          )}

          {material.tipo === 'simulado' && (
            <>
              <View style={[s.typePill, { backgroundColor: typeColor + '18' }]}>
                <Text style={[s.typePillTxt, { color: typeColor }]}>SIMULADO</Text>
              </View>
              {material.descricao ? <Text style={s.description}>{material.descricao}</Text> : null}

              <Text style={s.sectionLabel}>QUESTÕES</Text>
              {loadingQuestoes ? (
                <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
              ) : (questoes ?? []).length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>Nenhuma questão vinculada a este simulado.</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {(questoes ?? []).map((questao, index) => (
                    <QuestionCard key={questao.id} questao={questao} index={index} />
                  ))}
                </View>
              )}
            </>
          )}

          {material.tipo === 'card' && (
            <>
              <View style={[s.typePill, { backgroundColor: typeColor + '18' }]}>
                <Text style={[s.typePillTxt, { color: typeColor }]}>CARDS</Text>
              </View>
              {material.descricao ? <Text style={s.description}>{material.descricao}</Text> : null}

              <Text style={s.sectionLabel}>CARDS</Text>
              {loadingCards ? (
                <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
              ) : (cards ?? []).length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyTxt}>Nenhum card cadastrado neste material.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {(cards ?? []).map((card, index) => (
                    <MaterialCardPreview key={card.id} card={card} index={index} />
                  ))}
                </View>
              )}
            </>
          )}

          {material.tipo !== 'texto' && material.tipo !== 'simulado' && material.tipo !== 'card' && (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>Este material ainda não possui URL para renderização.</Text>
            </View>
          )}
        </ScrollView>
      )}
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
  openBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900 },
  webView: { flex: 1, backgroundColor: colors.white },
  videoWrap: { flex: 1, backgroundColor: colors.ink900, justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.ink900 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, marginBottom: 14, backgroundColor: colors.ink100 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginBottom: 10 },
  typePillTxt: { fontSize: 10, fontWeight: '800' },
  description: { fontSize: 13, color: colors.ink500, lineHeight: 19, marginBottom: 12 },
  bodyText: { fontSize: 14, color: colors.ink900, lineHeight: 22, backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.ink100 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 10,
  },
  albumRow: { gap: 10, paddingRight: 4 },
  albumImage: { width: 220, height: 140, borderRadius: 13, backgroundColor: colors.ink100 },
  questionCard: {
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 14,
    padding: 12, backgroundColor: colors.white,
  },
  questionTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  questionNumBox: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: colors.ink50,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  questionNum: { fontSize: 11, fontWeight: '700', color: colors.ink700 },
  questionId: { fontSize: 10, fontWeight: '700', color: colors.navy800, marginBottom: 4 },
  questionText: { fontSize: 12.5, fontWeight: '600', color: colors.ink900, lineHeight: 18 },
  optionList: { gap: 6, marginTop: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.ink50,
  },
  optionRowCorrect: { backgroundColor: '#16A34A12', borderWidth: 1, borderColor: '#16A34A30' },
  optionText: { flex: 1, fontSize: 12, color: colors.ink500 },
  optionTextCorrect: { color: '#166534', fontWeight: '600' },
  correctSummary: { fontSize: 11, color: '#166534', fontWeight: '600', marginTop: 9 },
  explanation: { fontSize: 11, color: colors.ink500, lineHeight: 16, marginTop: 6 },
  flashCard: {
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 15,
    backgroundColor: colors.white, overflow: 'hidden',
  },
  flashImageWrap: { aspectRatio: 4 / 3, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
  flashImage: { width: '100%', height: '100%' },
  flashBody: { padding: 12 },
  flashMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  flashIndex: {
    minWidth: 24, height: 24, borderRadius: 7,
    backgroundColor: '#FFEDD5', color: '#C2410C',
    textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontWeight: '800',
  },
  flashCategory: {
    flexShrink: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: colors.ink50, color: colors.ink500, fontSize: 10.5, fontWeight: '700',
  },
  flashTitle: { fontSize: 14, fontWeight: '800', color: colors.ink900, lineHeight: 19 },
  flashReading: { fontSize: 11.5, color: colors.ink500, lineHeight: 17, marginTop: 5 },
  flashDesc: { fontSize: 12, color: colors.ink600, lineHeight: 18, marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 12 },
  emptyTxt: { fontSize: 13, color: colors.ink400, textAlign: 'center' },
})
