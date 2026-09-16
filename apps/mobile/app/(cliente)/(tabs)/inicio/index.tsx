import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { listEtapasByProcesso } from '@ueno/firebase/queries/etapas'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { countUnreadNotificacoes } from '@ueno/firebase/queries/notificacoes'
import { listAvisosAtivos } from '@ueno/firebase/queries/avisos'
import { listFaqs } from '@ueno/firebase/queries/faq'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Aviso, FAQ } from '@ueno/firebase'

const { FlatList, useWindowDimensions } = require('react-native') as any

const AVISO_TIPO_LABEL: Record<string, string> = {
  logistica: 'Logística',
  promocao: 'Promoção',
  data_comemorativa: 'Data especial',
  geral: 'Aviso',
}

export default function InicioScreen() {
  const { session } = useAuthStore()

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos } = useQuery<any[]>({
    queryKey: ['processos', cliente?.id],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const activeProcesso = processos?.find((p) => p.status === 'ativo' || p.status === 'analise')

  const { data: etapas } = useQuery<any[]>({
    queryKey: ['etapas', activeProcesso?.id],
    queryFn: () => listEtapasByProcesso(db, activeProcesso!.id),
    enabled: !!activeProcesso,
  })

  const { data: agendamentos } = useQuery<any[]>({
    queryKey: ['agendamentos', 'prox', cliente?.id],
    queryFn: () => listAgendamentos(db, { cliente_id: cliente!.id }),
    enabled: !!cliente,
  })

  const { data: unread = 0 } = useQuery({
    queryKey: ['notif-unread', session?.userId],
    queryFn: () => countUnreadNotificacoes(db, session!.userId),
    enabled: !!session,
  })

  const now = new Date()
  const proxAgendamento = agendamentos
    ?.filter((a: any) => new Date(a.data_hora_inicio) > now)
    .sort((a: any, b: any) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())[0]

  const totalEtapas = Math.max(etapas?.length ?? 0, 5)
  const etapasConcluidas = etapas?.filter((e) => e.status === 'concluido').length ?? 2
  const etapaAtual = etapas?.find((e) => e.status === 'em_andamento') ?? etapas?.find((e) => e.status === 'pendente')
  const currentStepIndex = Math.min(etapasConcluidas, totalEtapas - 1)
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const hasActiveProcess = !!activeProcesso
  const etapaAtualLabel = (etapaAtual as any)?.titulo ?? 'Análise de documentos'

  const { data: faqs = [] } = useQuery({
    queryKey: ['faq-public'],
    queryFn: () => listFaqs(db),
    enabled: !!session,
  })

  const { data: avisos = [] } = useQuery({
    queryKey: ['avisos-ativos', session?.userId],
    queryFn: () => listAvisosAtivos(db),
    enabled: !!session,
  })

  const featuredFaqs = useMemo(() => {
    const published = faqs.filter((item) => item?.is_active)
    return published.slice(0, 3)
  }, [faqs])

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Header
          greeting={greeting}
          name={session?.fullName ?? 'Cliente'}
          avatarUrl={session?.avatarUrl}
          unread={unread}
        />

        {hasActiveProcess ? (
          <ActiveHome
            activeProcesso={activeProcesso}
            avisos={avisos}
            featuredFaqs={featuredFaqs}
            totalEtapas={totalEtapas}
            currentStepIndex={currentStepIndex}
            etapaAtualLabel={etapaAtualLabel}
            proxAgendamento={proxAgendamento}
          />
        ) : (
          <FreeHome
            avisos={avisos}
            featuredFaqs={featuredFaqs}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Header({
  greeting,
  name,
  avatarUrl,
  unread,
}: {
  greeting: string
  name: string
  avatarUrl?: string | null
  unread: number
}) {
  return (
    <View style={s.headerRow}>
      <View style={s.headerLeft}>
        <Avatar name={name} size={42} url={avatarUrl} />
        <View style={{ marginLeft: 11 }}>
          <Text style={s.greetSub}>{greeting}</Text>
          <Text style={s.greetName}>{name}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.bellWrap} onPress={() => router.push('/notificacoes' as any)} activeOpacity={0.8}>
        <Ionicons name="notifications-outline" size={20} color={colors.ink700} />
        {unread > 0 && <View style={s.bellDot} />}
      </TouchableOpacity>
    </View>
  )
}

function ActiveHome({
  activeProcesso,
  avisos,
  featuredFaqs,
  totalEtapas,
  currentStepIndex,
  etapaAtualLabel,
  proxAgendamento,
}: {
  activeProcesso: any
  avisos: Aviso[]
  featuredFaqs: any[]
  totalEtapas: number
  currentStepIndex: number
  etapaAtualLabel: string
  proxAgendamento?: any
}) {
  return (
    <>
      {avisos.length > 0 && <AvisosSection avisos={avisos} />}

      <TouchableOpacity
        style={s.heroCard}
        activeOpacity={0.88}
        onPress={() => router.push('/(cliente)/processos' as any)}
      >
        <View style={s.heroCircle1} />
        <View style={s.heroCircle2} />

        <View style={s.heroTopRow}>
          <View style={s.processoActivePill}>
            <View style={s.processoActiveDot} />
            <Text style={s.processoActiveTxt}>Processo ativo</Text>
          </View>
          <Text style={s.heroId}>#{String(activeProcesso?.id ?? '').slice(-4).toUpperCase()}</Text>
        </View>

        <Text style={s.heroServiceLabel}>SERVIÇO</Text>
        <Text style={s.heroServiceName}>{activeProcesso?.servico?.nome ?? 'Serviço'}</Text>

        <View style={s.stepper}>
          {Array.from({ length: totalEtapas }).map((_, i) => {
            const done = i < currentStepIndex
            const cur = i === currentStepIndex
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', flex: i < totalEtapas - 1 ? 1 : 0 }}>
                <View style={[s.stepDot, done && s.stepDone, cur && s.stepCur]}>
                  <Text style={[s.stepDotTxt, done && s.stepDotTxtDone, cur && s.stepDotTxtCur]}>
                    {done ? '✓' : i + 1}
                  </Text>
                </View>
                {i < totalEtapas - 1 && (
                  <View style={[s.stepLine, { backgroundColor: done ? '#5EEAD4' : 'rgba(255,255,255,.18)' }]} />
                )}
              </View>
            )
          })}
        </View>

        <View style={s.heroBottom}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={s.heroStepLabel}>Etapa atual</Text>
            <Text style={s.heroStepName}>{etapaAtualLabel}</Text>
          </View>
          <View style={s.heroDetRow}>
            <Text style={s.heroDetTxt}>Ver detalhes </Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,.85)" />
          </View>
        </View>
      </TouchableOpacity>

      {proxAgendamento && (
        <TouchableOpacity style={s.nextAppt} activeOpacity={0.8} onPress={() => router.push('/(cliente)/agenda' as any)}>
          <View style={s.nextApptDate}>
            <Text style={s.nextApptMon}>
              {format(new Date(proxAgendamento.data_hora_inicio), 'MMM', { locale: ptBR }).toUpperCase()}
            </Text>
            <Text style={s.nextApptDay}>
              {format(new Date(proxAgendamento.data_hora_inicio), 'd')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.nextApptSubtitle}>PRÓXIMO AGENDAMENTO</Text>
            <Text style={s.nextApptTitle}>{proxAgendamento?.servico?.nome ?? 'Agendamento'}</Text>
            <View style={s.nextApptTimeRow}>
              <Ionicons name="time-outline" size={12} color={colors.ink500} />
              <Text style={s.nextApptTime}>
                {' '}
                {format(new Date(proxAgendamento.data_hora_inicio), 'HH:mm')}
                {proxAgendamento.local ? ` · ${proxAgendamento.local}` : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.navy800} />
        </TouchableOpacity>
      )}

      <View style={s.faqHeader}>
        <Text style={s.sectionLabel}>FAQ</Text>
        <TouchableOpacity onPress={() => router.push('/(cliente)/faq' as any)}>
          <Text style={s.verTudo}>Ver tudo</Text>
        </TouchableOpacity>
      </View>
      <View style={{ gap: 8 }}>
        {featuredFaqs.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={s.faqCard}
            activeOpacity={0.78}
            onPress={() => router.push(`/(cliente)/faq/${f.id}` as any)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.faqTag}>{(f.categoria_nome || f.t || 'FAQ').toUpperCase()}</Text>
              <Text style={s.faqQ}>{f.pergunta ?? f.q}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  )
}

function FreeHome({
  avisos,
  featuredFaqs,
}: {
  avisos: Aviso[]
  featuredFaqs: any[]
}) {
  return (
    <>
      {avisos.length > 0 && <AvisosSection avisos={avisos} />}

      <View style={s.freeHero}>
        <View style={s.freeHeroDecor1} />
        <View style={s.freeHeroDecor2} />
        <Text style={s.freeHeroKanji}>上野</Text>

        <View style={[s.chip, s.freeHeroChip]}>
          <Ionicons name="star" size={10} color={colors.white} />
          <Text style={s.freeHeroChipTxt}>Comece sua jornada</Text>
        </View>

        <Text style={s.freeHeroTitle}>Pronta para dirigir no Japão?</Text>
        <Text style={s.freeHeroText}>
          Fale com a nossa equipe e descubra o melhor caminho para o seu caso.
        </Text>

        <View style={s.freeHeroButtons}>
          <TouchableOpacity style={s.freeHeroPrimaryBtn} activeOpacity={0.82} onPress={() => router.push('/(cliente)/faq' as any)}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.navy800} />
            <Text style={s.freeHeroPrimaryTxt}>Falar com a equipe</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.onboardCard}>
        <View style={s.onboardHeader}>
          <View>
            <Text style={s.onboardEyebrow}>COMECE POR AQUI</Text>
            <Text style={s.onboardTitle}>Configure sua conta</Text>
          </View>
          <Text style={s.onboardProgressTxt}>2 de 3</Text>
        </View>

        <View style={s.onboardProgressBar}>
          <View style={s.onboardProgressFill} />
        </View>

        <View style={{ gap: 8 }}>
          {[
            { t: 'Crie sua conta', done: true },
            { t: 'Verifique seu e-mail', done: true },
            {
              t: 'Complete dados pessoais',
              current: true,
              onPress: () => router.push('/(cliente)/(tabs)/perfil/dados-pessoais', { withAnchor: true }),
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.t}
              style={s.onboardRow}
              onPress={item.onPress}
              disabled={!item.onPress}
              activeOpacity={0.72}
              accessibilityRole={item.onPress ? 'button' : undefined}
              accessibilityLabel={item.onPress ? item.t : undefined}
            >
              <View style={[
                s.onboardDot,
                item.done && s.onboardDotDone,
                item.current && s.onboardDotCurrent,
              ]}>
                {item.done ? <Ionicons name="checkmark" size={12} color={colors.white} /> : item.current ? <View style={s.onboardDotInner} /> : null}
              </View>
              <Text style={[
                s.onboardRowText,
                item.done && s.onboardRowDone,
                item.current && s.onboardRowCurrent,
              ]}>
                {item.t}
              </Text>
              {item.onPress && <Ionicons name="chevron-forward" size={14} color={colors.navy800} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.assessmentCard} activeOpacity={0.78} onPress={() => router.push('/(cliente)/faq' as any)}>
        <View style={s.assessmentIconWrap}>
          <Ionicons name="chatbubble-outline" size={22} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.assessmentTitle}>Pré-análise gratuita</Text>
          <Text style={s.assessmentText}>Converse com nossa equipe e descubra o melhor caminho.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#92400E" />
      </TouchableOpacity>

      <View style={s.faqHeader}>
        <Text style={s.sectionLabel}>DÚVIDAS COMUNS</Text>
        <TouchableOpacity onPress={() => router.push('/(cliente)/faq' as any)}>
          <Text style={s.verTudo}>Ver tudo</Text>
        </TouchableOpacity>
      </View>
      <View style={{ gap: 8 }}>
        {featuredFaqs.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={s.faqCard}
            activeOpacity={0.78}
            onPress={() => router.push(`/(cliente)/faq/${f.id}` as any)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.faqTag}>{(f.categoria_nome || f.t || 'FAQ').toUpperCase()}</Text>
              <Text style={s.faqQ}>{f.pergunta ?? f.q}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  )
}

function AvisosSection({ avisos }: { avisos: Aviso[] }) {
  const { width } = useWindowDimensions()
  const isSingle = avisos.length === 1
  const cardWidth = isSingle ? Math.max(width - 40, 0) : 176

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.sectionLabel}>AVISOS</Text>
      <FlatList
        data={avisos}
        keyExtractor={(a: Aviso) => a.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }: { item: Aviso }) => (
          <AvisoBannerCard
            aviso={item}
            onPress={() => router.push(`/(cliente)/avisos/${item.id}` as any)}
            wide={isSingle}
            width={cardWidth}
          />
        )}
        contentContainerStyle={[bs.avisosRow, isSingle && bs.avisosRowSingle]}
      />
    </View>
  )
}

function AvisoBannerCard({
  aviso,
  onPress,
  wide,
  width,
}: {
  aviso: Aviso
  onPress: () => void
  wide?: boolean
  width?: number
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = !!aviso.banner_url && !imageFailed

  return (
    <TouchableOpacity
      style={[
        bs.card,
        wide ? [bs.cardWide, width != null && { width }] : null,
      ]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {hasImage ? (
        <AppImage
          source={{ uri: aviso.banner_url }}
          style={wide ? [bs.img, bs.imgWide] : bs.img}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[bs.fallback, wide ? bs.imgWide : bs.img]}>
          <Ionicons name="megaphone-outline" size={24} color={colors.navy800} />
          <Text style={bs.fallbackTitle} numberOfLines={2}>{aviso.titulo}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  greetSub: { fontSize: 12, color: colors.ink500 },
  greetName: { fontSize: 15, fontWeight: '600', color: colors.ink900, letterSpacing: -0.3 },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: colors.white,
  },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    backgroundColor: colors.navy800,
    shadowColor: colors.navy900,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 36,
    elevation: 10,
    overflow: 'hidden',
  },
  heroCircle1: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,.05)' },
  heroCircle2: { position: 'absolute', right: -60, bottom: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,.04)' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  processoActivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.16)' },
  processoActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5EEAD4' },
  processoActiveTxt: { fontSize: 11, color: 'white', fontWeight: '600' },
  heroId: { fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: '500' },
  heroServiceLabel: { fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: '500', marginBottom: 2 },
  heroServiceName: { fontSize: 18, fontWeight: '700', color: 'white', letterSpacing: -0.4, marginBottom: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#5EEAD4' },
  stepCur: { backgroundColor: 'white', shadowColor: 'white', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
  stepDotTxt: { fontSize: 9, fontWeight: '700', color: colors.navy900 },
  stepDotTxtDone: { color: colors.navy900 },
  stepDotTxtCur: { color: colors.navy800 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroStepLabel: { fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 2 },
  heroStepName: { fontSize: 14, fontWeight: '600', color: 'white' },
  heroDetRow: { flexDirection: 'row', alignItems: 'center' },
  heroDetTxt: { fontSize: 12, color: 'rgba(255,255,255,.85)', fontWeight: '500' },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  nextAppt: {
    backgroundColor: colors.navy50,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.navy100,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  nextApptDate: { width: 48, height: 54, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  nextApptMon: { fontSize: 9, color: colors.navy800, fontWeight: '700', letterSpacing: 0.5 },
  nextApptDay: { fontSize: 18, fontWeight: '700', color: colors.navy800, lineHeight: 20 },
  nextApptSubtitle: { fontSize: 10, color: colors.navy700, fontWeight: '600', letterSpacing: 0.6, marginBottom: 2 },
  nextApptTitle: { fontSize: 14, fontWeight: '600', color: colors.ink900, marginBottom: 2 },
  nextApptTimeRow: { flexDirection: 'row', alignItems: 'center' },
  nextApptTime: { fontSize: 12, color: colors.ink500 },

  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  verTudo: { fontSize: 12, color: colors.navy800, fontWeight: '600' },
  faqCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqTag: { fontSize: 9.5, color: colors.ink400, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  faqQ: { fontSize: 13, fontWeight: '500', color: colors.ink900, lineHeight: 18 },

  freeHero: {
    position: 'relative',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    backgroundColor: colors.navy800,
    overflow: 'hidden',
    shadowColor: colors.navy900,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 10,
    minHeight: 188,
  },
  freeHeroDecor1: { position: 'absolute', right: -56, top: -44, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,.05)' },
  freeHeroDecor2: { position: 'absolute', right: 12, top: 8, width: 136, height: 136, borderRadius: 68, backgroundColor: 'rgba(255,255,255,.04)' },
  freeHeroKanji: { position: 'absolute', right: 12, top: 8, fontSize: 58, fontWeight: '700', color: 'rgba(255,255,255,.06)', lineHeight: 58 },
  freeHeroChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  freeHeroChipTxt: { fontSize: 11, color: colors.white, fontWeight: '600' },
  freeHeroTitle: { fontSize: 20, fontWeight: '700', color: colors.white, letterSpacing: -0.5, marginTop: 10, maxWidth: 230, lineHeight: 24 },
  freeHeroText: { fontSize: 12.5, color: 'rgba(255,255,255,.86)', marginTop: 8, lineHeight: 18, maxWidth: 260 },
  freeHeroButtons: { flexDirection: 'row', gap: 8, marginTop: 14 },
  freeHeroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  freeHeroPrimaryTxt: { fontSize: 12.5, fontWeight: '700', color: colors.navy800 },

  onboardCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 14,
    marginBottom: 24,
    shadowColor: colors.navy900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  onboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 },
  onboardEyebrow: { fontSize: 10.5, color: colors.navy800, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  onboardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink900, marginTop: 2 },
  onboardProgressTxt: { fontSize: 11, fontWeight: '700', color: colors.navy800 },
  onboardProgressBar: { height: 5, borderRadius: 3, backgroundColor: colors.ink100, overflow: 'hidden', marginBottom: 14 },
  onboardProgressFill: { width: '67%', height: '100%', borderRadius: 3, backgroundColor: colors.navy800 },
  onboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onboardDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  onboardDotDone: { backgroundColor: '#16A34A' },
  onboardDotCurrent: { borderWidth: 2, borderColor: colors.navy800, backgroundColor: colors.white },
  onboardDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.navy800 },
  onboardRowText: { flex: 1, fontSize: 12.5, fontWeight: '500', color: colors.ink900 },
  onboardRowDone: { color: colors.ink400, textDecorationLine: 'line-through' },
  onboardRowCurrent: { fontWeight: '700' },

  assessmentCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FBBF24',
    padding: 14,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 2,
  },
  assessmentTitle: { fontSize: 13.5, fontWeight: '700', color: '#92400E', letterSpacing: -0.2 },
  assessmentText: { fontSize: 11.5, color: '#92400E', opacity: 0.85, marginTop: 2, lineHeight: 16 },
})

const bs = StyleSheet.create({
  card: { width: 176, height: 112, borderRadius: 14, overflow: 'hidden', marginRight: 10, backgroundColor: colors.navy50 },
  cardWide: { marginRight: 0, height: 132 },
  img: { width: 176, height: 112 },
  imgWide: { width: '100%', height: 132 },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.navy50,
  },
  fallbackTitle: {
    color: colors.navy800,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  avisosRow: { paddingRight: 4 },
  avisosRowSingle: { paddingRight: 0 },
})
