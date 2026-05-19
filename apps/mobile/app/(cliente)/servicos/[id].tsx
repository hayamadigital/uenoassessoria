import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/firebase'
import { colors } from '@/theme'
import { getServico } from '@ueno/firebase/queries/servicos'
import { listVariacoesByServico } from '@ueno/firebase/queries/servico_variacoes'
import { listEtapaTemplatesByServico } from '@ueno/firebase/queries/etapa_templates'
import type { EtapaTemplate, ResponsavelEtapa, Servico, ServicoVariacao } from '@ueno/firebase'

const responsavelLabel: Record<ResponsavelEtapa, string> = {
  cliente: 'Cliente',
  assessoria: 'Assessoria',
  menkyocenter: 'Menkyo Center',
  outros: 'Outros',
}

function formatPreco(item: Pick<Servico | ServicoVariacao, 'preco_variavel' | 'preco_jpy' | 'preco_min_jpy' | 'preco_max_jpy'>) {
  if (item.preco_variavel && item.preco_min_jpy != null && item.preco_max_jpy != null) {
    return `¥ ${item.preco_min_jpy.toLocaleString('ja-JP')} - ¥ ${item.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return item.preco_jpy != null ? `¥ ${item.preco_jpy.toLocaleString('ja-JP')}` : 'Sob consulta'
}

function getStepVariacaoLabel(template: EtapaTemplate, variacoes: ServicoVariacao[]) {
  if (variacoes.length === 0) return null
  if (template.variacao_ids.length === 0) return 'Todas as variações'
  const names = template.variacao_ids
    .map((id) => variacoes.find((variacao) => variacao.id === id)?.nome)
    .filter(Boolean)
  return names.length > 0 ? names.join(', ') : null
}

export default function ServicoDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const serviceId = typeof id === 'string' ? id : undefined
  const [imageFailed, setImageFailed] = useState(false)
  const [selectedVariacaoId, setSelectedVariacaoId] = useState<string | null>(null)

  const { data: servico, isLoading: isLoadingServico } = useQuery({
    queryKey: ['servicos', serviceId],
    queryFn: () => getServico(db, serviceId!),
    enabled: !!serviceId,
  })

  const { data: variacoes, isLoading: isLoadingVariacoes } = useQuery({
    queryKey: ['servico-variacoes', serviceId, 'active'],
    queryFn: () => listVariacoesByServico(db, serviceId!, true),
    enabled: !!serviceId,
  })

  const { data: etapas, isLoading: isLoadingEtapas } = useQuery({
    queryKey: ['etapa-templates', serviceId],
    queryFn: () => listEtapaTemplatesByServico(db, serviceId!),
    enabled: !!serviceId,
  })

  const activeVariacoes = variacoes ?? []
  const selectedVariacao = activeVariacoes.find((variacao) => variacao.id === selectedVariacaoId) ?? null

  useEffect(() => {
    if (!selectedVariacaoId && activeVariacoes.length > 0) {
      setSelectedVariacaoId(activeVariacoes[0]!.id)
    }
  }, [activeVariacoes, selectedVariacaoId])

  const visibleEtapas = useMemo(() => {
    const allEtapas = etapas ?? []
    if (!selectedVariacao) return allEtapas
    return allEtapas.filter((etapa) => (
      etapa.variacao_ids.length === 0 || etapa.variacao_ids.includes(selectedVariacao.id)
    ))
  }, [etapas, selectedVariacao])

  const detailPrice = selectedVariacao ? formatPreco(selectedVariacao) : servico ? formatPreco(servico) : null
  const detailDuration = selectedVariacao?.duracao_texto ?? servico?.duracao_texto ?? null
  const imageUri = servico?.imagem_url?.trim()
  if (isLoadingServico) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={colors.navy800} />
      </SafeAreaView>
    )
  }

  if (!servico) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={s.emptyTitle}>Serviço não encontrado</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.emptyBtnTxt}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          {imageUri && !imageFailed ? (
            <Image
              source={{ uri: imageUri }}
              style={s.heroImage}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={s.heroFallback}>
              <View style={s.sun} />
              <View style={s.mountainBack} />
              <View style={s.mountainFront} />
              <View style={s.road} />
              <View style={s.roadLine} />
              <Text style={s.heroKanji}>上野</Text>
            </View>
          )}
          <View style={s.heroShade} />
          <View style={s.heroTop}>
            <TouchableOpacity style={s.heroIconBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <View style={s.heroBadge}>
              <Ionicons name="layers-outline" size={13} color="#FBBF24" />
              <Text style={s.heroBadgeTxt}>Serviço Ueno</Text>
            </View>
          </View>
        </View>

        <View style={s.panel}>
          <Text style={s.title}>{servico.nome}</Text>
          <View style={s.metaRow}>
            <View style={s.starRow}>
              {[0, 1, 2, 3, 4].map((star) => (
                <Ionicons key={star} name="star" size={14} color="#FBBF24" />
              ))}
            </View>
            {detailDuration ? <Text style={s.metaTxt}>· {detailDuration}</Text> : null}
            <Text style={s.metaTxt}>· {activeVariacoes.length || 1} opção{activeVariacoes.length === 1 ? '' : 'ões'}</Text>
          </View>

          <View style={s.statsRow}>
            <InfoStat icon="cash-outline" value={detailPrice ?? 'Sob consulta'} label="valor" />
            <InfoStat icon="time-outline" value={detailDuration ?? 'Sob consulta'} label="duração" />
            <InfoStat icon="checkmark-done-outline" value={String(visibleEtapas.length)} label="etapas" />
          </View>

          {servico.descricao ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Sobre o serviço</Text>
              <Text style={s.description}>{servico.descricao}</Text>
            </View>
          ) : null}

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Variações</Text>
              {isLoadingVariacoes ? <ActivityIndicator size="small" color={colors.navy800} /> : null}
            </View>
            {activeVariacoes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.variationsRow}>
                {activeVariacoes.map((variacao) => {
                  const isSelected = selectedVariacaoId === variacao.id
                  return (
                    <TouchableOpacity
                      key={variacao.id}
                      style={[s.variationCard, isSelected && s.variationCardActive]}
                      onPress={() => setSelectedVariacaoId(variacao.id)}
                      activeOpacity={0.85}
                    >
                      <View style={s.variationTop}>
                        <Text style={[s.variationName, isSelected && s.variationNameActive]} numberOfLines={2}>
                          {variacao.nome}
                        </Text>
                        {isSelected ? <Ionicons name="checkmark-circle" size={18} color={colors.white} /> : null}
                      </View>
                      <Text style={[s.variationPrice, isSelected && s.variationPriceActive]}>
                        {formatPreco(variacao)}
                      </Text>
                      {variacao.duracao_texto ? (
                        <Text style={[s.variationMeta, isSelected && s.variationMetaActive]}>
                          {variacao.duracao_texto}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            ) : (
              <View style={s.plainBox}>
                <Text style={s.plainTitle}>{formatPreco(servico)}</Text>
                <Text style={s.plainTxt}>
                  {servico.preco_variavel ? 'Valor apresentado em faixa para este serviço.' : 'Este serviço não possui variações ativas.'}
                </Text>
              </View>
            )}
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Etapas incluídas</Text>
              {isLoadingEtapas ? <ActivityIndicator size="small" color={colors.navy800} /> : null}
            </View>
            {visibleEtapas.length > 0 ? (
              <View style={s.timeline}>
                {visibleEtapas.map((etapa, index) => (
                  <StepRow
                    key={etapa.id}
                    etapa={etapa}
                    index={index}
                    isLast={index === visibleEtapas.length - 1}
                    variacoes={activeVariacoes}
                  />
                ))}
              </View>
            ) : (
              <View style={s.plainBox}>
                <Text style={s.plainTitle}>Nenhuma etapa cadastrada</Text>
                <Text style={s.plainTxt}>Quando a assessoria configurar as etapas no web, elas aparecerão aqui.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bottomLabel}>A partir de</Text>
          <Text style={s.bottomPrice} numberOfLines={1}>{detailPrice ?? 'Sob consulta'}</Text>
        </View>
        <TouchableOpacity
          style={s.bottomBtn}
          onPress={() => Alert.alert('Contratar serviço', 'Fale com a equipe Ueno para iniciar este serviço.')}
          activeOpacity={0.88}
        >
          <Text style={s.bottomBtnTxt}>Contratar agora</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function InfoStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={21} color={colors.ink900} />
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function StepRow({
  etapa,
  index,
  isLast,
  variacoes,
}: {
  etapa: EtapaTemplate
  index: number
  isLast: boolean
  variacoes: ServicoVariacao[]
}) {
  const variacaoLabel = getStepVariacaoLabel(etapa, variacoes)

  return (
    <View style={s.stepRow}>
      <View style={s.stepRail}>
        <View style={s.stepDot}>
          <Text style={s.stepDotTxt}>{index + 1}</Text>
        </View>
        {!isLast ? <View style={s.stepLine} /> : null}
      </View>
      <View style={s.stepBody}>
        <View style={s.stepTitleRow}>
          <Text style={s.stepTitle}>{etapa.nome}</Text>
          <View style={s.responsavelPill}>
            <Text style={s.responsavelTxt}>{responsavelLabel[etapa.responsavel_padrao]}</Text>
          </View>
        </View>
        {etapa.descricao ? <Text style={s.stepDesc}>{etapa.descricao}</Text> : null}
        {variacaoLabel ? <Text style={s.stepVariacao}>{variacaoLabel}</Text> : null}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  scroll: { flex: 1, backgroundColor: colors.ink50 },
  content: { paddingBottom: 112 },
  hero: { height: 330, backgroundColor: colors.navy800, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 23, 61, 0.34)' },
  heroTop: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    marginTop: 104,
    marginRight: 'auto',
    marginLeft: -52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(11,16,32,0.35)',
  },
  heroBadgeTxt: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  heroFallback: { flex: 1, backgroundColor: colors.navy800, position: 'relative', overflow: 'hidden' },
  heroKanji: {
    position: 'absolute',
    right: 28,
    top: 34,
    fontFamily: 'serif',
    fontSize: 86,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.08)',
  },
  sun: { position: 'absolute', right: 70, top: 92, width: 74, height: 74, borderRadius: 37, backgroundColor: '#F4B72E' },
  mountainBack: {
    position: 'absolute',
    right: -10,
    bottom: 74,
    width: 250,
    height: 128,
    backgroundColor: 'rgba(89,119,205,0.55)',
    transform: [{ rotate: '45deg' }],
  },
  mountainFront: {
    position: 'absolute',
    left: 34,
    bottom: -38,
    width: 292,
    height: 216,
    backgroundColor: '#152A64',
    transform: [{ rotate: '45deg' }],
  },
  road: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -80,
    width: 122,
    height: 248,
    backgroundColor: '#101F4D',
    transform: [{ perspective: 300 }, { rotateX: '58deg' }],
  },
  roadLine: { position: 'absolute', bottom: 62, alignSelf: 'center', width: 5, height: 142, backgroundColor: '#FBBF24' },
  panel: {
    marginTop: -42,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '800', lineHeight: 38, color: colors.ink900, letterSpacing: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaTxt: { fontSize: 13.5, color: colors.ink500, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  statCard: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.ink50,
    paddingHorizontal: 10,
  },
  statValue: { marginTop: 8, fontSize: 16, fontWeight: '800', color: colors.ink900, textAlign: 'center' },
  statLabel: { marginTop: 2, fontSize: 12, color: colors.ink500, textAlign: 'center' },
  section: { marginTop: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 1.4 },
  description: { marginTop: 14, fontSize: 17, lineHeight: 28, color: colors.ink700 },
  variationsRow: { gap: 12, paddingRight: 20 },
  variationCard: {
    width: 210,
    minHeight: 136,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
  },
  variationCardActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  variationTop: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  variationName: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 20, color: colors.ink900 },
  variationNameActive: { color: colors.white },
  variationPrice: { marginTop: 14, fontSize: 15, fontWeight: '800', color: colors.navy800 },
  variationPriceActive: { color: colors.white },
  variationMeta: { marginTop: 6, fontSize: 12.5, color: colors.ink500 },
  variationMetaActive: { color: 'rgba(255,255,255,0.72)' },
  plainBox: { borderRadius: 18, backgroundColor: colors.ink50, padding: 16, borderWidth: 1, borderColor: colors.ink100 },
  plainTitle: { fontSize: 15, fontWeight: '800', color: colors.ink900 },
  plainTxt: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.ink500 },
  timeline: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 13 },
  stepRail: { width: 28, alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F8EE', alignItems: 'center', justifyContent: 'center' },
  stepDotTxt: { fontSize: 12, fontWeight: '800', color: colors.ok },
  stepLine: { flex: 1, width: 2, minHeight: 54, backgroundColor: colors.ink100 },
  stepBody: { flex: 1, paddingBottom: 22 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink900, lineHeight: 22 },
  responsavelPill: { borderRadius: 999, backgroundColor: colors.navy50, paddingHorizontal: 9, paddingVertical: 4 },
  responsavelTxt: { fontSize: 10.5, fontWeight: '800', color: colors.navy800 },
  stepDesc: { marginTop: 6, fontSize: 13.5, lineHeight: 20, color: colors.ink500 },
  stepVariacao: { marginTop: 7, fontSize: 12, fontWeight: '700', color: colors.ink400 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  bottomLabel: { fontSize: 12, color: colors.ink500, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  bottomPrice: { marginTop: 2, fontSize: 20, color: colors.ink900, fontWeight: '900' },
  bottomBtn: {
    minWidth: 184,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  bottomBtnTxt: { color: colors.white, fontSize: 16, fontWeight: '800' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink700 },
  emptyBtn: { borderRadius: 14, backgroundColor: colors.navy800, paddingHorizontal: 18, paddingVertical: 11 },
  emptyBtnTxt: { color: colors.white, fontWeight: '700' },
})
