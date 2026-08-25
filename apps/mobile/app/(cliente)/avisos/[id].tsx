import { useState, type ReactNode } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getAviso } from '@ueno/firebase/queries/avisos'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import { useAuthStore } from '@/stores/auth.store'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { TipoAviso } from '@ueno/firebase'

const { FlatList, Dimensions } = require('react-native') as any
const { width: SCREEN_W } = Dimensions.get('window')
const CONTENT_WIDTH = SCREEN_W - 40

const TIPO_LABEL: Record<TipoAviso, string> = {
  logistica: 'Logística',
  promocao: 'Promoção',
  data_comemorativa: 'Data Comemorativa',
  geral: 'Aviso',
}

const TIPO_COLORS: Record<TipoAviso, { bg: string; text: string }> = {
  logistica:         { bg: '#FEE2E2', text: '#991B1B' },
  promocao:          { bg: '#EDE9FE', text: '#5B21B6' },
  data_comemorativa: { bg: '#FEF9C3', text: '#854D0E' },
  geral:             { bg: '#F1F5F9', text: '#475569' },
}

export default function AvisoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const [activeIndex, setActiveIndex] = useState(0)
  const [carouselHeights, setCarouselHeights] = useState<Record<number, number>>({})

  const { data: aviso, isLoading } = useQuery({
    queryKey: ['aviso', id, session?.userId],
    queryFn: () => getAviso(db, id!),
    enabled: !!id && !!session?.userId,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink50 }}>
        <ActivityIndicator color={colors.navy800} />
      </View>
    )
  }

  if (!aviso) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink50 }}>
        <Text style={{ color: colors.ink500 }}>Aviso não encontrado</Text>
      </View>
    )
  }

  const contentImages = aviso.imagens_carrossel
  const showStackedImages = aviso.conteudo_tipo === 'imagens' || aviso.imagens_layout === 'lista'
  const tipoColors = TIPO_COLORS[aviso.tipo]
  const heroWidth = SCREEN_W
  const activeCarouselHeight = carouselHeights[activeIndex]

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink50 }}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <MeasuredImage
          uri={aviso.banner_url}
          width={heroWidth}
          containerStyle={s.heroWrap}
          imageStyle={s.heroImage}
        >
          <TouchableOpacity
            style={[s.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>
        </MeasuredImage>

        {/* Content */}
        <View style={s.content}>
          <View style={[s.tipoBadge, { backgroundColor: tipoColors.bg }]}>
            <Text style={[s.tipoTxt, { color: tipoColors.text }]}>
              {TIPO_LABEL[aviso.tipo].toUpperCase()}
            </Text>
          </View>

          <Text style={s.titulo}>{aviso.titulo}</Text>

          <View style={s.datesRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.ink500} />
            <Text style={s.dates}>
              {' '}
              {format(new Date(aviso.data_publicacao), "d 'de' MMM", { locale: ptBR })}
              {' → '}
              {format(new Date(aviso.data_encerramento), "d 'de' MMM yyyy", { locale: ptBR })}
            </Text>
          </View>

          {aviso.conteudo_tipo === 'texto' && aviso.descricao ? (
            <Text style={s.descricao}>{aviso.descricao}</Text>
          ) : null}

          {contentImages.length > 0 ? (
            <View style={s.imagesSection}>
              <Text style={s.imagesLabel}>{showStackedImages ? 'Imagens' : 'Carrossel de imagens'}</Text>
              {showStackedImages ? (
                <View style={s.imageStack}>
                  {contentImages.map((item, i) => (
                    <MeasuredImage
                      key={`${item}-${i}`}
                      uri={item}
                      width={CONTENT_WIDTH}
                      containerStyle={s.stackImageWrap}
                      imageStyle={s.stackImage}
                    />
                  ))}
                </View>
              ) : (
                <View>
                  <View style={[s.carouselWrap, activeCarouselHeight ? { height: activeCarouselHeight } : null]}>
                    <FlatList
                      data={contentImages}
                      keyExtractor={(_: string, i: number) => String(i)}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={(e: any) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / CONTENT_WIDTH)
                        setActiveIndex(idx)
                      }}
                      renderItem={({ item, index }: { item: string; index: number }) => (
                        <MeasuredImage
                          uri={item}
                          width={CONTENT_WIDTH}
                          containerStyle={s.carouselImageWrap}
                          imageStyle={s.carouselImage}
                        />
                      )}
                      contentContainerStyle={s.carouselRow}
                    />
                  </View>
                  {contentImages.length > 1 && (
                    <View style={s.dotsRow}>
                      {contentImages.map((_, i) => (
                        <View
                          key={i}
                          style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : null}

          {aviso.conteudo_tipo === 'imagens' && aviso.descricao ? (
            <Text style={s.descricao}>{aviso.descricao}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { height: 4, borderRadius: 2 },
  dotActive: { width: 16, backgroundColor: 'white' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },

  content: { padding: 20, paddingBottom: 36 },
  heroWrap: {
    width: '100%',
  },
  heroImage: {
    width: '100%',
  },

  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  tipoTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink900,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 8,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dates: { fontSize: 13, color: colors.ink500 },

  descricao: {
    fontSize: 15,
    color: colors.ink700,
    lineHeight: 22,
  },
  imagesSection: {
    marginTop: 6,
  },
  imagesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  imageStack: {
    gap: 12,
  },
  stackImageWrap: {
    width: '100%',
  },
  stackImage: {
    width: '100%',
  },
  carouselWrap: {
    width: CONTENT_WIDTH,
  },
  carouselImageWrap: {
    width: CONTENT_WIDTH,
  },
  carouselImage: {
    width: '100%',
  },
  carouselRow: {
    paddingRight: 0,
    gap: 10,
  },
})

function MeasuredImage({
  uri,
  width,
  containerStyle,
  imageStyle,
  children,
}: {
  uri: string
  width: number
  containerStyle?: any
  imageStyle?: any
  children?: ReactNode
}) {
  const [aspectRatio, setAspectRatio] = useState(1)

  return (
    <View style={[{ width, aspectRatio }, containerStyle]}>
      <AppImage
        source={{ uri }}
        style={[{ width: '100%', height: '100%' }, imageStyle]}
        contentFit="contain"
        onLoad={(event) => {
          const { width: imgWidth, height: imgHeight } = event.source || {}
          if (imgWidth && imgHeight) {
            setAspectRatio(imgWidth / imgHeight)
          }
        }}
      />
      {children}
    </View>
  )
}
