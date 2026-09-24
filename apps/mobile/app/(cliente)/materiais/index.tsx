import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { WebView } from 'react-native-webview'
import { db } from '@/lib/firebase'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import { getMaterial, listMaterialCards } from '@ueno/firebase/queries/materiais'
import type { MaterialCard } from '@ueno/firebase'

function CardItem({ card, index }: { card: MaterialCard; index: number }) {
  return (
    <View style={s.flashCard}>
      <View style={s.imageWrap}>
        <AppImage source={{ uri: card.imagem_url }} style={s.cardImage} contentFit="contain" />
      </View>
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={s.cardIndex}>{index + 1}</Text>
          {card.categoria ? <Text style={s.categoryPill}>{card.categoria}</Text> : null}
        </View>
        <Text style={s.cardTitle}>{card.legenda_pt}</Text>
        {[card.legenda_kanji, card.legenda_hiragana, card.legenda_romaji].filter(Boolean).length > 0 ? (
          <Text style={s.cardReading}>
            {[card.legenda_kanji, card.legenda_hiragana, card.legenda_romaji].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {card.descricao ? <Text style={s.cardDesc}>{card.descricao}</Text> : null}
        {card.credito_imagem ? <Text style={s.credit}>{card.credito_imagem}</Text> : null}
      </View>
    </View>
  )
}

export default function ClienteMaterialScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()

  const { data: material, isLoading: loadingMaterial } = useQuery({
    queryKey: ['cliente-material-detail', id],
    queryFn: () => getMaterial(db, id!),
    enabled: !!id,
  })

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['cliente-material-cards', id],
    queryFn: () => listMaterialCards(db, id!),
    enabled: !!id && material?.tipo === 'card',
  })

  if (!id) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Ionicons name="albums-outline" size={42} color={colors.ink300} />
          <Text style={s.emptyTitle}>Material não informado</Text>
        </View>
      </SafeAreaView>
    )
  }

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
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.82}>
            <Ionicons name="chevron-back" size={18} color={colors.ink700} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Material não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const url = material.url ?? ''
  const shouldRenderLinkFrame = material.tipo === 'link' && !!url
  const canOpenUrl = !!url && ['pdf', 'video'].includes(material.tipo)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.82}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerSub}>{material.tipo === 'card' ? 'Cards' : 'Material'}</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{material.titulo}</Text>
        </View>
        {canOpenUrl ? (
          <TouchableOpacity style={s.openBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.82}>
            <Ionicons name="open-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      {shouldRenderLinkFrame ? (
        <WebView
          source={{ uri: url }}
          style={s.webView}
          startInLoadingState
          renderLoading={() => (
            <View style={s.webLoading}>
              <ActivityIndicator color={colors.navy800} />
            </View>
          )}
        />
      ) : (
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {material.banner_url ? (
          <AppImage source={{ uri: material.banner_url }} style={s.banner} />
        ) : null}

        <View style={s.hero}>
          <Text style={s.heroLabel}>{material.tipo === 'card' ? `${cards.length} cards` : material.tipo.toUpperCase()}</Text>
          <Text style={s.heroTitle}>{material.titulo}</Text>
          {material.descricao ? <Text style={s.heroDesc}>{material.descricao}</Text> : null}
        </View>

        {material.tipo === 'card' ? (
          loadingCards ? (
            <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
          ) : cards.length === 0 ? (
            <View style={s.centerBlock}>
              <Text style={s.emptyTitle}>Nenhum card cadastrado</Text>
              <Text style={s.emptySub}>Este material ainda não tem cards para estudo.</Text>
            </View>
          ) : (
            <View style={s.cardList}>
              {cards.map((card, index) => (
                <CardItem key={card.id} card={card} index={index} />
              ))}
            </View>
          )
        ) : material.tipo === 'texto' ? (
          <Text style={s.textContent}>{material.conteudo_texto ?? material.descricao ?? 'Sem conteúdo cadastrado.'}</Text>
        ) : canOpenUrl ? (
          <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(url)} activeOpacity={0.84}>
            <Text style={s.primaryBtnText}>Abrir material</Text>
            <Ionicons name="open-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={s.centerBlock}>
            <Text style={s.emptyTitle}>Material sem visualização</Text>
            <Text style={s.emptySub}>Ainda não há conteúdo disponível para este material.</Text>
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
  iconBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  openBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink900 },
  webView: { flex: 1, backgroundColor: colors.white },
  webLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, marginBottom: 14, backgroundColor: colors.ink100 },
  hero: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 16, padding: 16, marginBottom: 14,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: colors.navy800, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.ink900, letterSpacing: -0.4 },
  heroDesc: { fontSize: 13, color: colors.ink500, lineHeight: 20, marginTop: 8 },
  cardList: { gap: 14 },
  flashCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 18, overflow: 'hidden',
  },
  imageWrap: { backgroundColor: colors.ink50, aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center' },
  cardImage: { width: '100%', height: '100%' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardIndex: {
    minWidth: 26, height: 26, borderRadius: 8,
    backgroundColor: colors.navy100, color: colors.navy800,
    textAlign: 'center', textAlignVertical: 'center', fontSize: 11, fontWeight: '800',
  },
  categoryPill: {
    flexShrink: 1, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: '#FFEDD5', color: '#C2410C', fontSize: 11, fontWeight: '700',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink900, lineHeight: 21, letterSpacing: -0.2 },
  cardReading: { fontSize: 12, color: colors.ink500, marginTop: 5, lineHeight: 18 },
  cardDesc: { fontSize: 13, color: colors.ink600, lineHeight: 20, marginTop: 10 },
  credit: { fontSize: 10, color: colors.ink400, marginTop: 10, fontStyle: 'italic' },
  textContent: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 16, padding: 16, fontSize: 14, color: colors.ink900, lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.navy800, borderRadius: 14, paddingVertical: 14,
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  centerBlock: {
    alignItems: 'center', padding: 26, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.ink100, borderRadius: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink700, textAlign: 'center', marginTop: 8 },
  emptySub: { fontSize: 12.5, color: colors.ink500, textAlign: 'center', lineHeight: 19, marginTop: 4 },
})
