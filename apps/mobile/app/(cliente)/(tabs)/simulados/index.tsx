import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDownloadURL, ref } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import { useNavigation } from '@react-navigation/native'
import { useAuthStore } from '@/stores/auth.store'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import {
  createSimuladoResultado,
  listCategoriasMaterial,
  listClienteSimuladoResultados,
  listMateriais,
  listSimuladoQuestoes,
} from '@ueno/firebase/queries/materiais'
import { createErroReport } from '@ueno/firebase/queries/questoes'
import type { CategoriaMaterial, ClienteSimuladoResultado, Material, QuestaoWithDetails, SimuladoResultadoResposta } from '@ueno/firebase'

type SimuladosView = 'home' | 'categoria' | 'pre' | 'questao' | 'analisando' | 'resultado' | 'historico' | 'revisao'

type CategoryCard = {
  id: string
  nome: string
  descricao: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
  premium?: boolean
  simCount: number
  matCount: number
  isFallback?: boolean
}

type HistoryItem = {
  id: string
  simuladoId: string
  title: string
  category: string
  score: number
  total: number
  attempt: number
  createdAt: string
  respostas?: SimuladoResultadoResposta[]
  local?: boolean
}

type RespostaModo = 'durante' | 'depois'
type AnswerValue = string | string[]
type ReviewFilter = 'todas' | 'erradas'

const FALLBACK_CATEGORIES = [
  { id: 'fallback-sinalizacao', nome: 'Sinalização', descricao: 'Placas regulamentares, advertência e indicação', icon: 'navigate-circle-outline', color: colors.navy800, bg: colors.navy100 },
  { id: 'fallback-regras', nome: 'Regras de circulação', descricao: 'Velocidades, preferências e ultrapassagens', icon: 'car-sport-outline', color: '#0891B2', bg: '#CFFAFE' },
  { id: 'fallback-vocabulario', nome: 'Vocabulário JP', descricao: 'Termos essenciais para entender as provas', icon: 'language-outline', color: '#7E22CE', bg: '#F3E8FF' },
  { id: 'fallback-praticas', nome: 'Práticas de direção', descricao: 'Procedimentos de baliza, curva e estacionamento', icon: 'shield-checkmark-outline', color: '#0F766E', bg: '#CCFBF1' },
  { id: 'fallback-provas', nome: 'Provas anteriores', descricao: 'Simulados completos de anos passados', icon: 'albums-outline', color: colors.warn, bg: '#FEF3C7', premium: true },
] satisfies Omit<CategoryCard, 'simCount' | 'matCount' | 'isFallback'>[]

const CATEGORY_PALETTE = [
  { icon: 'navigate-circle-outline', color: colors.navy800, bg: colors.navy100 },
  { icon: 'car-sport-outline', color: '#0891B2', bg: '#CFFAFE' },
  { icon: 'language-outline', color: '#7E22CE', bg: '#F3E8FF' },
  { icon: 'shield-checkmark-outline', color: '#0F766E', bg: '#CCFBF1' },
  { icon: 'albums-outline', color: colors.warn, bg: '#FEF3C7' },
] satisfies { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[]

function AnalisandoScreen({ onDone }: { onDone: () => void }) {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.85)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start()

    const makeBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -10, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      )

    makeBounce(dot1, 0).start()
    makeBounce(dot2, 160).start()
    makeBounce(dot3, 320).start()

    const timer = setTimeout(onDone, 2600)
    return () => clearTimeout(timer)
  }, [onDone, dot1, dot2, dot3, scale, opacity])

  return (
    <SafeAreaView style={analisandoStyles.safe}>
      <Animated.View style={[analisandoStyles.container, { opacity, transform: [{ scale }] }]}>
        <View style={analisandoStyles.iconWrap}>
          <Ionicons name="analytics-outline" size={44} color={colors.navy800} />
        </View>
        <Text style={analisandoStyles.title}>Analisando respostas</Text>
        <Text style={analisandoStyles.sub}>Calculando seu resultado...</Text>
        <View style={analisandoStyles.dotsRow}>
          {([dot1, dot2, dot3] as Animated.Value[]).map((anim, i) => (
            <Animated.View
              key={i}
              style={[analisandoStyles.dot, { transform: [{ translateY: anim }] }]}
            />
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const analisandoStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  iconWrap: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.navy50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink900, letterSpacing: -0.4 },
  sub: { fontSize: 13.5, color: colors.ink500 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.navy800 },
})

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function questionIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatShortDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Recente'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function answerIds(value: AnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : []
}

function buildRespostaSnapshots(
  questoes: QuestaoWithDetails[],
  respostas: Record<string, AnswerValue>,
): SimuladoResultadoResposta[] {
  return questoes.map((questao) => {
    const selectedOptionIds = answerIds(respostas[questao.id])
    const correctOptionIds = questao.opcoes.filter((op) => op.is_correta).map((op) => op.id)
    const isCorrect =
      selectedOptionIds.length > 0 &&
      selectedOptionIds.length === correctOptionIds.length &&
      selectedOptionIds.every((id) => correctOptionIds.includes(id)) &&
      correctOptionIds.every((id) => selectedOptionIds.includes(id))

    return {
      questao_id: questao.id,
      selected_option_ids: selectedOptionIds,
      correct_option_ids: correctOptionIds,
      is_correct: isCorrect,
    }
  })
}

function estimateMinutes(material: Material | null, questionCount: number) {
  if (material?.duracao_min) return material.duracao_min
  return Math.max(10, Math.ceil((questionCount || 20) * 0.75))
}

function categoryVisual(category: CategoriaMaterial, index: number) {
  const name = category.nome.toLowerCase()
  if (name.includes('sinal')) return CATEGORY_PALETTE[0]
  if (name.includes('regra') || name.includes('circula')) return CATEGORY_PALETTE[1]
  if (name.includes('jp') || name.includes('jap') || name.includes('voc')) return CATEGORY_PALETTE[2]
  if (name.includes('prat') || name.includes('dire')) return CATEGORY_PALETTE[3]
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]
}

async function resolveQuestionImageUrl(url: string) {
  const cleanUrl = url.trim()
  if (!cleanUrl) return null
  if (/^(https?:|file:|data:image)/i.test(cleanUrl)) return cleanUrl
  return getDownloadURL(ref(storage, cleanUrl))
}

const SIMULADO_VIEWS: SimuladosView[] = ['pre', 'questao', 'analisando', 'resultado', 'revisao']

export default function SimuladosScreen() {
  const { simuladoId: routeSimuladoId } = useLocalSearchParams<{ simuladoId?: string }>()
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const navigation = useNavigation()
  const [view, setView] = useState<SimuladosView>('home')
  const [busca, setBusca] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSimuladoId, setSelectedSimuladoId] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [confirmedAnswers, setConfirmedAnswers] = useState<Record<string, boolean>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [hasSavedResult, setHasSavedResult] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([])
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<HistoryItem | null>(null)
  const [reviewChoiceItem, setReviewChoiceItem] = useState<HistoryItem | null>(null)
  const [selectedReviewFilter, setSelectedReviewFilter] = useState<ReviewFilter>('todas')
  const [reportQuestionId, setReportQuestionId] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const [respostaModo, setRespostaModo] = useState<RespostaModo>('durante')
  const openedRouteSimuladoRef = useRef<string | null>(null)

  useEffect(() => {
    const isInSimulado = SIMULADO_VIEWS.includes(view)
    navigation.setOptions({
      tabBarStyle: isInSimulado
        ? { display: 'none' }
        : {
            borderTopColor: colors.ink100,
            borderTopWidth: 1,
            height: 78,
            paddingBottom: 20,
            paddingTop: 8,
            backgroundColor: 'rgba(255,255,255,0.97)',
          },
    })
  }, [view, navigation])

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: simuladoResultados } = useQuery({
    queryKey: ['cliente-simulado-resultados', session?.userId],
    queryFn: () => listClienteSimuladoResultados(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos } = useQuery({
    queryKey: ['processos', cliente?.id],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const canViewPrivateMaterials = (processos ?? []).some((processo) => processo.status === 'ativo' || processo.status === 'analise')

  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ['categorias-material', session?.userId],
    queryFn: () => listCategoriasMaterial(db),
    enabled: !!session,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: materiais = [], isLoading: loadingMateriais } = useQuery({
    queryKey: ['materiais-cliente-simulados', session?.userId, canViewPrivateMaterials],
    queryFn: () => listMateriais(db, undefined, !canViewPrivateMaterials),
    enabled: !!session,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: questoesSimulado, isLoading: loadingQuestoesSimulado } = useQuery({
    queryKey: ['cliente-simulado-questoes', selectedSimuladoId],
    queryFn: () => listSimuladoQuestoes(db, selectedSimuladoId!),
    enabled: !!selectedSimuladoId && ['pre', 'questao', 'resultado', 'revisao'].includes(view),
  })

  const reportMutation = useMutation({
    mutationFn: ({ questaoId, descricao }: { questaoId: string; descricao: string }) =>
      createErroReport(db, {
        questao_id: questaoId,
        reportado_por: session?.userId ?? null,
        descricao,
        status: 'pendente',
      }),
    onSuccess: () => {
      setReportQuestionId(null)
      setReportText('')
      Alert.alert('Relato enviado', 'Nossa equipe vai revisar esta questão.')
    },
    onError: () => {
      Alert.alert('Não foi possível enviar', 'Tente novamente em alguns instantes.')
    },
  })

  const resultadoMutation = useMutation({
    mutationFn: ({ score, total, tentativa, respostas }: { score: number; total: number; tentativa: number; respostas: SimuladoResultadoResposta[] }) =>
      createSimuladoResultado(db, {
        cliente_id: session!.userId,
        simulado_id: selectedSimuladoId!,
        score,
        total,
        tentativa,
        respostas,
      }),
    onError: () => {
      Alert.alert('Resultado não salvo', 'O simulado foi finalizado, mas não conseguimos registrar o resultado agora.')
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente-simulado-resultados', session?.userId] })
    },
  })

  const allMaterials = materiais ?? []
  const visibleMaterials = allMaterials.filter(
    (material) => material.is_active !== false && (material.is_public || canViewPrivateMaterials),
  )
  const isLoading = loadingMateriais || loadingCategorias

  const allSimulados = visibleMaterials
    .filter((m) => m.tipo === 'simulado')
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  const selectedSimulado = allSimulados.find((m) => m.id === selectedSimuladoId) ?? null
  const simuladoQuestions = questoesSimulado ?? []
  const currentQuestion = simuladoQuestions[currentQuestionIndex] ?? null
  const showImmediateFeedback = respostaModo === 'durante'
  const allResultados = simuladoResultados ?? []
  const resultadosBySimulado = useMemo(() => {
    return allResultados.reduce<Record<string, ClienteSimuladoResultado[]>>((acc, resultado) => {
      acc[resultado.simulado_id] ??= []
      acc[resultado.simulado_id].push(resultado)
      return acc
    }, {})
  }, [allResultados])
  const simuladoStatsMap = useMemo(() => {
    return Object.fromEntries(
      Object.entries(resultadosBySimulado).map(([simuladoId, resultados]) => {
        const scores = resultados.map((item) => Math.round((item.score / Math.max(item.total, 1)) * 100))
        const avgPct = scores.length ? Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length) : 0
        const bestPct = scores.length ? Math.max(...scores) : 0
        const latest = resultados[0] ?? null
        return [
          simuladoId,
          {
            attempts: resultados.length,
            avgPct,
            bestPct,
            latest,
          },
        ] as const
      }),
    ) as Record<
      string,
      {
        attempts: number
        avgPct: number
        bestPct: number
        latest: ClienteSimuladoResultado | null
      }
    >
  }, [resultadosBySimulado])
  const selectedCategory = useMemo(() => {
    const cards = buildCategoryCards(categorias ?? [], visibleMaterials)
    return cards.find((c) => c.id === selectedCategoryId) ?? cards[0] ?? null
  }, [categorias, selectedCategoryId, visibleMaterials])

  const categoryMaterials = useMemo(() => {
    if (!selectedCategory) return visibleMaterials
    if (selectedCategory.isFallback) return visibleMaterials
    return visibleMaterials.filter((m) => m.categoria_id === selectedCategory.id)
  }, [selectedCategory, visibleMaterials])

  const categorySimulados = categoryMaterials
    .filter((m) => m.tipo === 'simulado')
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  const categoryStudyMaterials = categoryMaterials.filter((m) => m.tipo !== 'simulado')
  const categorySimuladosVisiveis = categorySimulados
  const visibleCategorySimuladoCount = categorySimuladosVisiveis.length
  const totalAttempts = allResultados.length
  const totalScorePct = totalAttempts
    ? Math.round(
        allResultados.reduce((acc, item) => acc + Math.round((item.score / Math.max(item.total, 1)) * 100), 0) / totalAttempts,
      )
    : 0
  const uniqueSimuladosDone = new Set(allResultados.map((item) => item.simulado_id)).size
  const selectedCategoryAttemptCount = useMemo(() => {
    if (!selectedCategory || selectedCategory.isFallback) return totalAttempts
    const categorySimuladoIds = allSimulados
      .filter((material) => material.categoria_id === selectedCategory.id)
      .map((material) => material.id)
    return categorySimuladoIds.reduce((acc, simuladoId) => acc + (resultadosBySimulado[simuladoId]?.length ?? 0), 0)
  }, [allSimulados, resultadosBySimulado, selectedCategory, totalAttempts])
  const answeredCount = simuladoQuestions.filter((q) => {
    const value = answers[q.id]
    return Array.isArray(value) ? value.length > 0 : !!value
  }).length
  const score = useMemo(
    () => simuladoQuestions.reduce((acc, q) => {
      const answerValue = answers[q.id]
      const selectedIds = Array.isArray(answerValue) ? answerValue : answerValue ? [answerValue] : []
      const correctIds = q.opcoes.filter((op) => op.is_correta).map((op) => op.id)
      if (selectedIds.length === 0) return acc
      const sameLength = selectedIds.length === correctIds.length
      const sameSet =
        sameLength &&
        selectedIds.every((id) => correctIds.includes(id)) &&
        correctIds.every((id) => selectedIds.includes(id))
      return acc + (sameSet ? 1 : 0)
    }, 0),
    [answers, simuladoQuestions],
  )
  const emAndamento = allResultados[0]
    ? allSimulados.find((m) => m.id === allResultados[0].simulado_id)
    : null
  const questionCount = simuladoQuestions.length || 20

  const historyItems = useMemo(() => {
    const remoteHistory: HistoryItem[] = allResultados.map((resultado) => {
      const material = allSimulados.find((m) => m.id === resultado.simulado_id)
      return {
        id: resultado.id,
        simuladoId: resultado.simulado_id,
        title: material?.titulo ?? 'Simulado',
        category: getCategoryName(categorias ?? [], material?.categoria_id ?? null),
        score: resultado.score,
        total: resultado.total,
        attempt: resultado.tentativa,
        createdAt: resultado.created_at,
        respostas: resultado.respostas ?? [],
      }
    })

    const items = [...sessionHistory, ...remoteHistory]
    const seen = new Set<string>()
    const uniqueItems = items.filter((item) => {
      const key = `${item.simuladoId}-${item.attempt}-${item.score}-${item.total}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return uniqueItems.slice(0, 12)
  }, [allResultados, allSimulados, categorias, sessionHistory])

  useEffect(() => {
    if (view !== 'questao' || !selectedSimuladoId || isCompleted) return undefined
    const interval = setInterval(() => {
      setElapsedSeconds((value) => value + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isCompleted, selectedSimuladoId, view])

  const resetSimuladoState = () => {
    setCurrentQuestionIndex(0)
    setAnswers({})
    setConfirmedAnswers({})
    setElapsedSeconds(0)
    setIsCompleted(false)
    setHasSavedResult(false)
  }

  const openCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setView('categoria')
  }

  const openPreSimulado = (simuladoId: string) => {
    setSelectedSimuladoId(simuladoId)
    resetSimuladoState()
    setRespostaModo('durante')
    setView('pre')
  }

  useEffect(() => {
    if (!routeSimuladoId || openedRouteSimuladoRef.current === routeSimuladoId) return
    if (!allSimulados.some((material) => material.id === routeSimuladoId)) return

    openedRouteSimuladoRef.current = routeSimuladoId
    openPreSimulado(routeSimuladoId)
  }, [allSimulados, routeSimuladoId])

  const startSimulado = () => {
    setSelectedHistoryResult(null)
    resetSimuladoState()
    setView('questao')
  }

  const closeSimulado = () => {
    resetSimuladoState()
    setRespostaModo('durante')
    setSelectedHistoryResult(null)
    setSelectedSimuladoId(null)
    setView(selectedCategoryId ? 'categoria' : 'home')
  }

  const answerQuestion = (question: QuestaoWithDetails, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[question.id]
      if (question.tipo_opcao === 'multipla') {
        const currentIds = Array.isArray(current) ? current : typeof current === 'string' && current ? [current] : []
        const nextIds = currentIds.includes(optionId)
          ? currentIds.filter((id) => id !== optionId)
          : [...currentIds, optionId]
        return { ...prev, [question.id]: nextIds }
      }
      return { ...prev, [question.id]: optionId }
    })
    setConfirmedAnswers((prev) => {
      if (!prev[question.id]) return prev
      const next = { ...prev }
      delete next[question.id]
      return next
    })
  }

  const confirmCurrentQuestion = () => {
    if (!currentQuestion) return
    const selectedAnswerValue = answers[currentQuestion.id]
    const selectedAnswerIds = Array.isArray(selectedAnswerValue)
      ? selectedAnswerValue
      : selectedAnswerValue
        ? [selectedAnswerValue]
        : []
    if (selectedAnswerIds.length === 0) return
    setConfirmedAnswers((prev) => ({ ...prev, [currentQuestion.id]: true }))
  }

  const finishSimulado = () => {
    setSelectedHistoryResult(null)
    setIsCompleted(true)
    setView('analisando')
    if (selectedSimulado && !hasSavedResult) {
      setHasSavedResult(true)
      const tentativa = (resultadosBySimulado[selectedSimulado.id]?.length ?? 0) + 1
      const createdAt = new Date().toISOString()
      const respostasSnapshot = buildRespostaSnapshots(simuladoQuestions, answers)
      setSessionHistory((prev) => [
        {
          id: `local-${selectedSimulado.id}-${Date.now()}`,
          simuladoId: selectedSimulado.id,
          title: selectedSimulado.titulo,
          category: getCategoryName(categorias ?? [], selectedSimulado.categoria_id),
          score,
          total: simuladoQuestions.length,
          attempt: tentativa,
          createdAt,
          respostas: respostasSnapshot,
          local: true,
        },
        ...prev,
      ])
    }
    if (session && selectedSimuladoId && simuladoQuestions.length > 0 && !resultadoMutation.isPending && !hasSavedResult) {
      const tentativa = (resultadosBySimulado[selectedSimuladoId]?.length ?? 0) + 1
      resultadoMutation.mutate({
        score,
        total: simuladoQuestions.length,
        tentativa,
        respostas: buildRespostaSnapshots(simuladoQuestions, answers),
      })
    }
  }

  const openHistoryItem = (item: HistoryItem) => {
    setReviewChoiceItem(item)
  }

  const openHistoryReview = (item: HistoryItem, filter: ReviewFilter) => {
    setReviewChoiceItem(null)
    setSelectedSimuladoId(item.simuladoId)
    resetSimuladoState()
    setSelectedHistoryResult(item)
    setSelectedReviewFilter(filter)
    setRespostaModo('depois')
    setView('revisao')
  }

  const openHistoryResult = (item: HistoryItem) => {
    setReviewChoiceItem(null)
    setSelectedSimuladoId(item.simuladoId)
    resetSimuladoState()
    setSelectedHistoryResult(item)
    setRespostaModo('depois')
    setView('resultado')
  }

  const closeResultado = () => {
    if (selectedHistoryResult) {
      setSelectedHistoryResult(null)
      setView('historico')
      return
    }
    closeSimulado()
  }

  const closeReview = () => {
    setSelectedHistoryResult(null)
    setSelectedReviewFilter('todas')
    setView('historico')
  }

  const goNextQuestion = () => {
    const selectedAnswerValue = currentQuestion ? answers[currentQuestion.id] : undefined
    const selectedAnswerIds = Array.isArray(selectedAnswerValue)
      ? selectedAnswerValue
      : selectedAnswerValue
        ? [selectedAnswerValue]
        : []
    const isQuestionConfirmed = !!currentQuestion && !!confirmedAnswers[currentQuestion.id]
    if (!selectedAnswerIds.length || (respostaModo === 'durante' && !isQuestionConfirmed)) return
    if (currentQuestionIndex >= simuladoQuestions.length - 1) {
      finishSimulado()
      return
    }
    setCurrentQuestionIndex((value) => value + 1)
  }

  const goPreviousQuestion = () => {
    setCurrentQuestionIndex((value) => Math.max(0, value - 1))
  }

  const handleReportQuestion = (questaoId: string) => {
    setReportQuestionId(questaoId)
    setReportText('')
  }

  const submitReport = () => {
    const descricao = reportText.trim()
    if (!reportQuestionId || descricao.length < 4) {
      Alert.alert('Descreva o problema', 'Escreva uma breve descrição para nossa equipe revisar.')
      return
    }
    reportMutation.mutate({ questaoId: reportQuestionId, descricao })
  }

  if (view === 'categoria') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.categoryHero}>
            <View style={s.heroOrbLarge} />
            <View style={s.heroTop}>
              <TouchableOpacity style={s.heroIconBtn} onPress={() => setView('home')} activeOpacity={0.82}>
                <Ionicons name="chevron-back" size={20} color={colors.white} />
              </TouchableOpacity>
              <Text style={s.heroTopLabel}>Simulados</Text>
              <View style={s.heroIconBtn}>
                <Ionicons name="filter-outline" size={17} color={colors.white} />
              </View>
            </View>

            <View style={s.categoryHeroTitleRow}>
              <View style={s.categoryHeroIcon}>
                <Ionicons name={selectedCategory?.icon ?? 'book-outline'} size={29} color={colors.white} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.categoryHeroTitle}>{selectedCategory?.nome ?? 'Simulados'}</Text>
                <Text style={s.categoryHeroDesc}>{selectedCategory?.descricao ?? 'Continue praticando para a prova teórica.'}</Text>
              </View>
            </View>

            <Text style={s.heroMetricLabel}>Tentativas registradas</Text>
            <View style={s.heroProgressLine}>
              <Text style={s.heroProgressNum}>{selectedCategoryAttemptCount}</Text>
              <Text style={s.heroProgressTxt}>{visibleCategorySimuladoCount} simulados disponíveis</Text>
            </View>
          </View>

          <View style={s.sectionPadded}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionLabel}>Simulados</Text>
              <Text style={s.sectionMeta}>{visibleCategorySimuladoCount} disponíveis</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
            ) : categorySimuladosVisiveis.length === 0 ? (
              <EmptyState title="Nenhum simulado nesta categoria" icon="reader-outline" />
            ) : (
              <View style={s.stack}>
                {categorySimuladosVisiveis.map((simulado, index) => (
                  <SimuladoRow
                    key={simulado.id}
                    material={simulado}
                    stats={simuladoStatsMap[simulado.id]}
                    onPress={() => openPreSimulado(simulado.id)}
                  />
                ))}
              </View>
            )}

            <Text style={[s.sectionLabel, { marginTop: 24 }]}>Materiais para estudo</Text>
            {categoryStudyMaterials.length === 0 ? (
              <EmptyState title="Sem materiais complementares" icon="document-text-outline" compact />
            ) : (
              <View style={s.stack}>
                {categoryStudyMaterials.slice(0, 4).map((material) => (
                  <StudyMaterialRow
                    key={material.id}
                    material={material}
                    onPress={() => router.push(`/(cliente)/materiais?id=${material.id}` as any)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (view === 'pre') {
    const minutes = estimateMinutes(selectedSimulado, simuladoQuestions.length)
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.preHero}>
            <View style={s.heroOrbLarge} />
            <View style={s.preAmberOrb} />
            <View style={s.heroTop}>
              <TouchableOpacity style={s.heroIconBtn} onPress={closeSimulado} activeOpacity={0.82}>
                <Ionicons name="chevron-back" size={20} color={colors.white} />
              </TouchableOpacity>
              <Text style={s.heroTopLabel}>{selectedCategory?.nome ?? 'Simulados'}</Text>
            </View>

            <View style={s.preChip}>
              <Text style={s.preChipTxt}>SIMULADO</Text>
            </View>
            <Text style={s.preTitle}>{selectedSimulado?.titulo ?? 'Simulado'}</Text>
            <Text style={s.preDesc}>
              {selectedSimulado?.descricao?.trim() || 'Teste seu conhecimento em um ambiente focado, com cronômetro e feedback de resposta.'}
            </Text>
          </View>

          <View style={s.preBody}>
            <View style={s.preStatsCard}>
              <StatMini icon="document-text-outline" value={loadingQuestoesSimulado ? '...' : String(questionCount)} label="questões" />
              <View style={s.verticalDivider} />
              <StatMini icon="time-outline" value={`~${minutes}`} label="minutos" />
              <View style={s.verticalDivider} />
              <StatMini icon="star-outline" value="80%" label="aprovação" />
            </View>

            <Text style={s.sectionLabel}>Como vai funcionar</Text>
            <View style={s.briefingList}>
              <BriefingRow icon="checkmark" color={colors.ok} title="Formato objetivo" text="Responda uma questão por vez, sem distrações da lista de materiais." />
              <BriefingRow icon="image-outline" color={colors.warn} title="Imagens opcionais" text="Quando houver placa ou ilustração cadastrada, ela aparece antes da pergunta." />
              <BriefingRow icon="time-outline" color={colors.navy800} title={`Cronômetro de ${minutes} min`} text="O tempo fica visível no topo durante todo o simulado." />
              <BriefingRow
                icon="book-outline"
                color="#7E22CE"
                title={showImmediateFeedback ? 'Feedback imediato' : 'Feedback no final'}
                text={showImmediateFeedback
                  ? 'Após responder, o app mostra a resposta correta e a explicação cadastrada.'
                  : 'As respostas corretas aparecem somente depois que você enviar todas as respostas.'}
              />
            </View>

            <View style={s.settingBox}>
              <Ionicons name="settings-outline" size={17} color={colors.navy800} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.settingLabel}>Mostrar resposta correta</Text>
                <View style={s.settingOptionsRow}>
                  <TouchableOpacity
                    style={[s.settingOptionBtn, respostaModo === 'durante' && s.settingOptionBtnActive]}
                    onPress={() => setRespostaModo('durante')}
                    activeOpacity={0.82}
                  >
                    <Text style={[s.settingOptionTxt, respostaModo === 'durante' && s.settingOptionTxtActive]}>
                      Durante
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.settingOptionBtn, respostaModo === 'depois' && s.settingOptionBtnActive]}
                    onPress={() => setRespostaModo('depois')}
                    activeOpacity={0.82}
                  >
                    <Text style={[s.settingOptionTxt, respostaModo === 'depois' && s.settingOptionTxtActive]}>
                      Depois
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={s.tipBox}>
              <Ionicons name="bulb-outline" size={18} color="#92400E" />
              <Text style={s.tipText}>Respire fundo. Este fluxo simula o ambiente da prova teórica japonesa.</Text>
            </View>

            <TouchableOpacity style={s.primaryAction} onPress={startSimulado} activeOpacity={0.86}>
              <Text style={s.primaryActionTxt}>Iniciar simulado</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostAction} onPress={closeSimulado} activeOpacity={0.75}>
              <Text style={s.ghostActionTxt}>Mais tarde</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (view === 'questao') {
    const hasQuestions = simuladoQuestions.length > 0
    const selectedAnswerValue = currentQuestion ? answers[currentQuestion.id] : undefined
    const selectedAnswerIds = Array.isArray(selectedAnswerValue)
      ? selectedAnswerValue
      : selectedAnswerValue
        ? [selectedAnswerValue]
        : []
    const correctOptionIds = currentQuestion?.opcoes.filter((op) => op.is_correta).map((op) => op.id) ?? []
    const correctOptions = currentQuestion?.opcoes.filter((op) => op.is_correta) ?? []
    const isQuestionConfirmed = !!currentQuestion && !!confirmedAnswers[currentQuestion.id]
    const showFeedbackNow = respostaModo === 'durante' && isQuestionConfirmed
    const isQuestionCorrect =
      selectedAnswerIds.length > 0 &&
      selectedAnswerIds.length === correctOptionIds.length &&
      selectedAnswerIds.every((id) => correctOptionIds.includes(id)) &&
      correctOptionIds.every((id) => selectedAnswerIds.includes(id))
    const progressPct = hasQuestions ? ((currentQuestionIndex + 1) / simuladoQuestions.length) * 100 : 0

    return (
      <SafeAreaView style={s.safeExam}>
        <View style={s.examHeader}>
          <TouchableOpacity style={s.examCloseBtn} onPress={closeSimulado} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={colors.ink900} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.examSub} numberOfLines={1}>{selectedSimulado?.titulo ?? 'Simulado'}</Text>
            <Text style={s.examTitle}>
              {loadingQuestoesSimulado ? 'Preparando simulado' : hasQuestions ? `Questão ${currentQuestionIndex + 1} de ${simuladoQuestions.length}` : 'Simulado sem questões'}
            </Text>
          </View>
          <View style={s.timerPill}>
            <Ionicons name="time-outline" size={14} color="#92400E" />
            <Text style={s.timerTxt}>{formatElapsed(elapsedSeconds)}</Text>
          </View>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.examContent} showsVerticalScrollIndicator={false}>
          {loadingQuestoesSimulado ? (
            <View style={s.examLoading}>
              <ActivityIndicator color={colors.navy800} />
              <Text style={s.examLoadingTxt}>Carregando questões...</Text>
            </View>
          ) : !currentQuestion ? (
            <View style={s.emptyExam}>
              <Ionicons name="reader-outline" size={34} color={colors.ink400} />
              <Text style={s.emptyTitle}>Nenhuma questão vinculada</Text>
              <Text style={s.emptySub}>Este simulado ainda precisa de questões para abrir o ambiente de prova.</Text>
            </View>
          ) : (
            <>
              <View style={s.examProgressBg}>
                <View style={[s.examProgressFill, { width: `${progressPct}%` }]} />
              </View>

              <Text style={s.questionIdTxt}>ID da questão: {questionIdentifier(currentQuestion.id)}</Text>
              <Text style={s.questionLabel}>{currentQuestion.tipo_opcao === 'booleano' ? 'Afirmação' : 'Questão'}</Text>
              <Text style={s.examQuestionText}>{currentQuestion.enunciado}</Text>

              <QuestionImagesBlock imagens={currentQuestion.imagens} />

              <View style={s.examOptions}>
                {currentQuestion.opcoes.map((op) => {
                  const isSelected = selectedAnswerIds.includes(op.id)
                  const showCorrect = showFeedbackNow && selectedAnswerIds.length > 0 && op.is_correta
                  const showWrong = showFeedbackNow && selectedAnswerIds.length > 0 && isSelected && !op.is_correta
                  const isMultiple = currentQuestion.tipo_opcao === 'multipla'
                  return (
                    <TouchableOpacity
                      key={op.id}
                      style={[s.examOption, isSelected && s.examOptionSelected, showCorrect && s.examOptionCorrect, showWrong && s.examOptionWrong]}
                      onPress={() => answerQuestion(currentQuestion, op.id)}
                      activeOpacity={0.85}
                    >
                      <View style={[s.examOptionIcon, showCorrect && { backgroundColor: '#DCFCE7' }, showWrong && { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons
                          name={
                            isMultiple
                              ? isSelected
                                ? 'checkbox'
                                : 'square-outline'
                              : showCorrect
                                ? 'checkmark'
                                : showWrong
                                  ? 'close'
                                  : isSelected
                                    ? 'ellipse'
                                    : 'ellipse-outline'
                          }
                          size={18}
                          color={showCorrect ? colors.ok : showWrong ? colors.err : colors.ink400}
                        />
                      </View>
                      <Text style={s.examOptionTxt}>{op.texto}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {showFeedbackNow && selectedAnswerIds.length > 0 && (
                <View style={s.feedbackBox}>
                  <View style={s.feedbackIcon}>
                    <Ionicons name="checkmark" size={17} color={colors.navy800} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.feedbackTitle}>
                      Resposta correta:
                    </Text>
                    {correctOptions.length > 0 ? (
                      <View style={s.correctAnswersList}>
                        {correctOptions.map((op) => (
                          <View key={op.id} style={s.correctAnswerChip}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.navy800} />
                            <Text style={s.correctAnswerTxt}>{op.texto}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={s.feedbackText}>Não definida</Text>
                    )}
                    {!!currentQuestion.explicacao && (
                      <Text style={s.feedbackText}>
                        {currentQuestion.explicacao}
                      </Text>
                    )}
                    <QuestionImagesBlock imagens={currentQuestion.explicacao_imagens ?? []} />
                  </View>
                </View>
              )}

              <View style={s.examFooter}>
                <TouchableOpacity style={s.reportBtn} activeOpacity={0.8} onPress={() => handleReportQuestion(currentQuestion.id)} disabled={reportMutation.isPending}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.warn} />
                  <Text style={s.reportTxt}>Relatar problema</Text>
                </TouchableOpacity>

                {respostaModo === 'durante' && (
                  <TouchableOpacity
                    style={[s.confirmBtn, selectedAnswerIds.length === 0 && s.confirmBtnDisabled, isQuestionConfirmed && s.confirmBtnConfirmed]}
                    activeOpacity={0.85}
                    disabled={selectedAnswerIds.length === 0}
                    onPress={confirmCurrentQuestion}
                  >
                    <Ionicons
                      name={isQuestionConfirmed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={16}
                      color={selectedAnswerIds.length === 0 ? colors.ink400 : colors.white}
                    />
                    <Text style={[s.confirmBtnTxt, selectedAnswerIds.length === 0 && s.confirmBtnTxtDisabled]}>
                      {isQuestionConfirmed ? 'Resposta confirmada' : 'Confirmar resposta'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={s.questionNavRow}>
                  <TouchableOpacity
                    style={[s.prevBtn, currentQuestionIndex === 0 && s.prevBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={currentQuestionIndex === 0}
                    onPress={goPreviousQuestion}
                  >
                    <Ionicons name="arrow-back" size={16} color={currentQuestionIndex === 0 ? colors.ink400 : colors.ink700} />
                    <Text style={[s.prevBtnTxt, currentQuestionIndex === 0 && s.prevBtnTxtDisabled]}>Anterior</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.nextBtn, (!selectedAnswerIds.length || (respostaModo === 'durante' && !isQuestionConfirmed)) && s.nextBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={!selectedAnswerIds.length || (respostaModo === 'durante' && !isQuestionConfirmed)}
                    onPress={goNextQuestion}
                  >
                    <Text style={s.nextBtnTxt}>{currentQuestionIndex >= simuladoQuestions.length - 1 ? 'Finalizar' : 'Próxima'}</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.white} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={s.examFootnote}>{answeredCount} de {simuladoQuestions.length} respondidas</Text>
            </>
          )}
        </ScrollView>

        <Modal
          animationType="fade"
          transparent
          visible={!!reportQuestionId}
          onRequestClose={() => setReportQuestionId(null)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBackdrop}>
            <View style={s.reportModal}>
              <View style={s.reportModalHeader}>
                <View style={s.reportModalIcon}>
                  <Ionicons name="alert-circle-outline" size={20} color={colors.warn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reportModalTitle}>Relatar problema</Text>
                  <Text style={s.reportModalSub}>Descreva o que parece incorreto nesta questão.</Text>
                </View>
                <TouchableOpacity style={s.reportModalClose} onPress={() => setReportQuestionId(null)} activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color={colors.ink500} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={s.reportInput}
                value={reportText}
                onChangeText={setReportText}
                placeholder="Ex.: A alternativa correta parece estar trocada..."
                placeholderTextColor={colors.ink400}
                multiline
                textAlignVertical="top"
                maxLength={600}
              />
              <Text style={s.reportCount}>{reportText.length}/600</Text>

              <View style={s.reportModalActions}>
                <TouchableOpacity style={s.reportCancelBtn} onPress={() => setReportQuestionId(null)} activeOpacity={0.85}>
                  <Text style={s.reportCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.reportSubmitBtn, (reportText.trim().length < 4 || reportMutation.isPending) && s.reportSubmitBtnDisabled]}
                  onPress={submitReport}
                  activeOpacity={0.85}
                  disabled={reportText.trim().length < 4 || reportMutation.isPending}
                >
                  <Text style={s.reportSubmitTxt}>{reportMutation.isPending ? 'Enviando...' : 'Enviar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    )
  }

  if (view === 'analisando') {
    return <AnalisandoScreen onDone={() => setView('resultado')} />
  }

  if (view === 'resultado') {
    const resultadoScore = selectedHistoryResult?.score ?? score
    const resultadoTotal = selectedHistoryResult?.total ?? simuladoQuestions.length
    const resultadoPct = resultadoTotal > 0 ? Math.round((resultadoScore / resultadoTotal) * 100) : 0
    const resultadoTitle = selectedHistoryResult?.title ?? selectedSimulado?.titulo ?? 'Simulado'
    const resultadoTentativa = selectedHistoryResult?.attempt ?? null
    const resultadoData = selectedHistoryResult?.createdAt ? formatShortDateTime(selectedHistoryResult.createdAt) : null
    const isHistoricalResult = !!selectedHistoryResult
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
          <View style={s.resultHero}>
            <View style={s.resultBubble} />
            <View style={s.resultTopbar}>
              <TouchableOpacity style={s.resultBackBtn} onPress={closeResultado} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={21} color={colors.white} />
              </TouchableOpacity>
              <Text style={s.resultHeader} numberOfLines={1}>Resultado · {resultadoTitle}</Text>
            </View>

            <View style={s.scoreRing}>
              <View style={s.scoreRingTrack}>
                <View style={[s.scoreRingFill, { borderTopColor: resultadoPct >= 70 ? '#FBBF24' : colors.ink300, borderRightColor: resultadoPct >= 70 ? '#FBBF24' : colors.ink300 }]} />
                <View style={s.scoreRingInner}>
                  <Text style={s.scorePct}>{resultadoPct}%</Text>
                  <Text style={s.scoreSub}>{resultadoScore} de {resultadoTotal} corretas</Text>
                </View>
              </View>
            </View>

            <View style={s.resultBadge}>
              <Ionicons name={resultadoPct >= 70 ? 'star-outline' : 'trending-up-outline'} size={13} color="#FBBF24" />
              <Text style={s.resultBadgeTxt}>{resultadoPct >= 70 ? 'Aprovado · acima da média' : 'Continue praticando'}</Text>
            </View>
          </View>

          <View style={s.resultStatsRow}>
            <ResultStat value={String(resultadoScore)} label="Acertos" color={colors.ok} />
            <ResultStat value={String(Math.max(resultadoTotal - resultadoScore, 0))} label="Erros" color={colors.err} />
            <ResultStat value={resultadoTentativa ? `#${resultadoTentativa}` : formatElapsed(elapsedSeconds)} label={resultadoTentativa ? 'Tentativa' : 'Tempo'} color={colors.navy800} />
          </View>

          {resultadoData && (
            <Text style={[s.sectionLabel, { paddingHorizontal: 20, marginBottom: 12 }]}>Realizado em {resultadoData}</Text>
          )}

          {!isHistoricalResult && (
            <>
            <Text style={[s.sectionLabel, { paddingHorizontal: 20 }]}>Revisão rápida</Text>
            <View style={s.reviewList}>
              {simuladoQuestions.map((q, index) => {
                const answerValue = answers[q.id]
                const selectedIds = Array.isArray(answerValue) ? answerValue : answerValue ? [answerValue] : []
                const selectedOptions = q.opcoes.filter((op) => selectedIds.includes(op.id))
                const correctOptions = q.opcoes.filter((op) => op.is_correta)
                const isCorrect =
                  selectedIds.length > 0 &&
                  selectedIds.length === correctOptions.length &&
                  selectedIds.every((id) => correctOptions.some((op) => op.id === id)) &&
                  correctOptions.every((op) => selectedIds.includes(op.id))
                return (
                <View key={q.id} style={s.reviewRow}>
                  <View style={[s.reviewIcon, { backgroundColor: isCorrect ? '#DCFCE7' : '#FEE2E2' }]}>
                    <Ionicons name={isCorrect ? 'checkmark' : 'close'} size={16} color={isCorrect ? colors.ok : colors.err} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.reviewTitle} numberOfLines={2}>Questão {index + 1}</Text>
                    <Text style={s.reviewMeta} numberOfLines={1}>
                      {showImmediateFeedback
                        ? (selectedOptions.map((op) => op.texto).join(', ') || 'Sem resposta')
                        : `Sua resposta: ${selectedOptions.map((op) => op.texto).join(', ') || 'Sem resposta'}`}
                    </Text>
                    {!showImmediateFeedback && (
                      <View style={s.reviewCorrectBlock}>
                        <Text style={s.reviewMetaSecondary}>Correta:</Text>
                        {correctOptions.length > 0 ? (
                          <View style={s.reviewCorrectList}>
                            {correctOptions.map((op) => (
                              <Text key={op.id} style={s.reviewCorrectChip} numberOfLines={2}>{op.texto}</Text>
                            ))}
                          </View>
                        ) : (
                          <Text style={s.reviewMetaSecondary}>Não definida</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
            </View>
            </>
          )}

          <View style={s.resultActions}>
            <TouchableOpacity
              style={s.secondaryAction}
              onPress={isHistoricalResult && selectedHistoryResult ? () => openHistoryReview(selectedHistoryResult, 'todas') : () => { setCurrentQuestionIndex(0); setView('questao') }}
              activeOpacity={0.85}
            >
              <Text style={s.secondaryActionTxt}>{isHistoricalResult ? 'Revisar simulado' : 'Revisar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primaryAction} onPress={() => { setSelectedHistoryResult(null); setView('historico') }} activeOpacity={0.85}>
              <Text style={s.primaryActionTxt}>{isHistoricalResult ? 'Voltar ao histórico' : 'Ver histórico'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (view === 'revisao') {
    const respostas = selectedHistoryResult?.respostas ?? []
    const respostasByQuestao = new Map(respostas.map((resposta) => [resposta.questao_id, resposta]))
    const reviewQuestions = simuladoQuestions
      .map((questao, originalIndex) => ({ questao, originalIndex, resposta: respostasByQuestao.get(questao.id) }))
      .filter((item) => selectedReviewFilter === 'todas' || item.resposta?.is_correct === false)
    const wrongCount = respostas.filter((resposta) => !resposta.is_correct).length
    const hasSavedAnswers = respostas.length > 0

    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <TopPlainHeader
            title={selectedReviewFilter === 'erradas' ? 'Questões erradas' : 'Revisão do simulado'}
            eyebrow={selectedHistoryResult ? `Tentativa ${selectedHistoryResult.attempt}` : 'Histórico'}
            onBack={closeReview}
            rightIcon="eye-outline"
          />

          <View style={s.reviewSummaryCard}>
            <Text style={s.reviewSummaryTitle}>{selectedHistoryResult?.title ?? 'Simulado'}</Text>
            <Text style={s.reviewSummaryMeta}>
              {selectedHistoryResult
                ? `${selectedHistoryResult.score} de ${selectedHistoryResult.total} corretas · ${wrongCount} errada(s)`
                : 'Revisão somente leitura'}
            </Text>
            <View style={s.reviewFilterRow}>
              <TouchableOpacity
                style={[s.reviewFilterBtn, selectedReviewFilter === 'todas' && s.reviewFilterBtnActive]}
                onPress={() => setSelectedReviewFilter('todas')}
                activeOpacity={0.82}
              >
                <Text style={[s.reviewFilterTxt, selectedReviewFilter === 'todas' && s.reviewFilterTxtActive]}>Todas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.reviewFilterBtn, selectedReviewFilter === 'erradas' && s.reviewFilterBtnActive]}
                onPress={() => setSelectedReviewFilter('erradas')}
                activeOpacity={0.82}
              >
                <Text style={[s.reviewFilterTxt, selectedReviewFilter === 'erradas' && s.reviewFilterTxtActive]}>Apenas erradas</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingQuestoesSimulado ? (
            <View style={s.examLoading}>
              <ActivityIndicator color={colors.navy800} />
              <Text style={s.examLoadingTxt}>Carregando revisão...</Text>
            </View>
          ) : !hasSavedAnswers ? (
            <View style={s.emptyExam}>
              <Ionicons name="information-circle-outline" size={34} color={colors.ink400} />
              <Text style={s.emptyTitle}>Resumo disponível, revisão indisponível</Text>
              <Text style={s.emptySub}>Esta tentativa foi realizada antes de salvarmos as respostas marcadas. As próximas tentativas já terão revisão completa.</Text>
            </View>
          ) : reviewQuestions.length === 0 ? (
            <View style={s.emptyExam}>
              <Ionicons name="checkmark-circle-outline" size={34} color={colors.ok} />
              <Text style={s.emptyTitle}>Nenhuma questão errada</Text>
              <Text style={s.emptySub}>Nesta tentativa você não errou nenhuma questão.</Text>
            </View>
          ) : (
            <View style={s.readOnlyReviewList}>
              {reviewQuestions.map(({ questao, originalIndex, resposta }) => {
                const selectedIds = resposta?.selected_option_ids ?? []
                const correctIds = resposta?.correct_option_ids ?? questao.opcoes.filter((op) => op.is_correta).map((op) => op.id)
                const isCorrect = resposta?.is_correct ?? false

                return (
                  <View key={questao.id} style={s.readOnlyQuestionCard}>
                    <View style={s.readOnlyQuestionHeader}>
                      <Text style={s.readOnlyIdTxt}>ID da questão: {questionIdentifier(questao.id)}</Text>
                      <View style={[s.readOnlyStatusBadge, isCorrect ? s.readOnlyStatusOk : s.readOnlyStatusErr]}>
                        <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={13} color={isCorrect ? colors.ok : colors.err} />
                        <Text style={[s.readOnlyStatusTxt, { color: isCorrect ? colors.ok : colors.err }]}>
                          {isCorrect ? 'Acertou' : 'Errou'}
                        </Text>
                      </View>
                    </View>
                    <Text style={s.reviewQuestionTitle}>Questão {originalIndex + 1}</Text>
                    <Text style={s.examQuestionText}>{questao.enunciado}</Text>
                    <QuestionImagesBlock imagens={questao.imagens} />

                    <View style={s.examOptions}>
                      {questao.opcoes.map((op) => {
                        const wasSelected = selectedIds.includes(op.id)
                        const isCorrectOption = correctIds.includes(op.id)
                        return (
                          <View
                            key={op.id}
                            style={[
                              s.examOption,
                              isCorrectOption && s.examOptionCorrect,
                              wasSelected && !isCorrectOption && s.examOptionWrong,
                            ]}
                          >
                            <View style={[s.examOptionIcon, isCorrectOption && { backgroundColor: '#DCFCE7' }, wasSelected && !isCorrectOption && { backgroundColor: '#FEE2E2' }]}>
                              <Ionicons
                                name={isCorrectOption ? 'checkmark' : wasSelected ? 'close' : 'ellipse-outline'}
                                size={18}
                                color={isCorrectOption ? colors.ok : wasSelected ? colors.err : colors.ink400}
                              />
                            </View>
                            <Text style={s.examOptionTxt}>{op.texto}</Text>
                          </View>
                        )
                      })}
                    </View>

                    {(questao.explicacao || questao.explicacao_imagens?.length > 0) && (
                      <View style={s.feedbackBox}>
                        <View style={s.feedbackIcon}>
                          <Ionicons name="book-outline" size={17} color={colors.navy800} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.feedbackTitle}>Explicação:</Text>
                          {!!questao.explicacao && <Text style={s.feedbackText}>{questao.explicacao}</Text>}
                          <QuestionImagesBlock imagens={questao.explicacao_imagens ?? []} />
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (view === 'historico') {
    const totalDone = historyItems.length
    const historyAvg = totalDone ? Math.round(historyItems.reduce((acc, item) => acc + Math.round((item.score / item.total) * 100), 0) / totalDone) : 0
    const uniqueDone = new Set(historyItems.map((item) => item.simuladoId)).size
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <TopPlainHeader title="Histórico" eyebrow="Simulados" onBack={() => setView('home')} rightIcon="filter-outline" />

          <View style={s.historySummary}>
            <ResultStat value={String(totalDone)} label="Tentativas" color={colors.navy800} />
            <ResultStat value={`${historyAvg}%`} label="Acerto médio" color={colors.ok} />
            <ResultStat value={String(uniqueDone)} label="Simulados" color="#0891B2" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.historyPills} contentContainerStyle={s.pillsRow}>
            {['Todos', 'Aprovados', 'Reprovados', 'Esta semana'].map((label, index) => (
              <View key={label} style={[s.pill, index === 0 && s.pillActive]}>
                <Text style={[s.pillTxt, index === 0 && s.pillTxtActive]}>{label}{index === 0 ? ` · ${totalDone}` : ''}</Text>
              </View>
            ))}
          </ScrollView>

          {historyItems.length === 0 ? (
            <EmptyState title="Nenhum simulado respondido ainda" icon="time-outline" />
          ) : (
            <View style={s.stack}>
              {historyItems.map((item) => (
                <HistoryRow key={item.id} item={item} onPress={() => openHistoryItem(item)} />
              ))}
            </View>
          )}
        </ScrollView>
        <Modal
          animationType="fade"
          transparent
          visible={!!reviewChoiceItem}
          onRequestClose={() => setReviewChoiceItem(null)}
        >
          <View style={s.modalBackdrop}>
            <View style={s.reportModal}>
              <View style={s.reportModalHeader}>
                <View style={s.reportModalIcon}>
                  <Ionicons name="reader-outline" size={20} color={colors.navy800} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reportModalTitle}>Revisar tentativa</Text>
                  <Text style={s.reportModalSub}>{reviewChoiceItem?.title ?? 'Escolha como deseja revisar este simulado.'}</Text>
                </View>
                <TouchableOpacity style={s.reportModalClose} onPress={() => setReviewChoiceItem(null)} activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color={colors.ink500} />
                </TouchableOpacity>
              </View>

              <View style={s.reviewChoiceList}>
                <TouchableOpacity
                  style={s.reviewChoiceBtn}
                  onPress={() => reviewChoiceItem && openHistoryReview(reviewChoiceItem, 'todas')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="list-outline" size={18} color={colors.navy800} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewChoiceTitle}>Ver todas as questões</Text>
                    <Text style={s.reviewChoiceSub}>Mostra acertos e erros, sem permitir alterações.</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.reviewChoiceBtn}
                  onPress={() => reviewChoiceItem && openHistoryReview(reviewChoiceItem, 'erradas')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.err} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewChoiceTitle}>Ver apenas as que errou</Text>
                    <Text style={s.reviewChoiceSub}>Foca só nas questões que precisam de reforço.</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.reviewChoiceBtn}
                  onPress={() => reviewChoiceItem && openHistoryResult(reviewChoiceItem)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="stats-chart-outline" size={18} color="#0891B2" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewChoiceTitle}>Ver resultado final</Text>
                    <Text style={s.reviewChoiceSub}>Abre somente o resumo da tentativa.</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    )
  }

  const categoryCards = buildCategoryCards(categorias ?? [], allMaterials)
  const filteredCategories = categoryCards.filter((cat) => busca.trim() === '' || cat.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Text style={s.headerSub}>Estude no seu ritmo</Text>
          <Text style={s.headerTitle}>Simulados &amp; materiais</Text>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.ink400} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar categoria ou tema"
            placeholderTextColor={colors.ink400}
            value={busca}
            onChangeText={setBusca}
          />
          <View style={s.flagDot} />
        </View>

        <View style={s.heroCard}>
          <View style={s.heroCircle} />
          <Text style={s.heroLabel}>SEU RESUMO</Text>
          <View style={s.heroMainRow}>
            <Text style={s.heroPct}>{totalScorePct}%</Text>
            <Text style={s.heroSub}>de acertos médios</Text>
          </View>
          <View style={s.heroStats}>
            <Text style={s.heroStat}><Text style={s.heroStatNum}>{uniqueSimuladosDone}</Text> simulados feitos</Text>
            <View style={s.heroDot} />
            <Text style={s.heroStat}><Text style={s.heroStatNum}>{totalAttempts}</Text> tentativas</Text>
            <View style={s.heroDot} />
            <Text style={s.heroStat}><Text style={s.heroStatNum}>{allSimulados.length}</Text> simulados</Text>
          </View>
        </View>

        <View style={s.quickGrid}>
          <TouchableOpacity
            style={s.quickCardLarge}
            activeOpacity={0.84}
            onPress={() => emAndamento ? openPreSimulado(emAndamento.id) : openCategory(categoryCards[0]?.id ?? FALLBACK_CATEGORIES[0].id)}
          >
            <View style={[s.quickIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star-outline" size={18} color="#92400E" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.quickEyebrow}>Continuar</Text>
              <Text style={s.quickTitle} numberOfLines={1}>{emAndamento?.titulo ?? 'Escolher simulado'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickCard} activeOpacity={0.84} onPress={() => setView('historico')}>
            <View style={[s.quickIcon, { backgroundColor: colors.navy50 }]}>
              <Ionicons name="time-outline" size={18} color={colors.navy800} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.quickEyebrow}>Histórico</Text>
              <Text style={s.quickTitle}>{historyItems.length} tentativas</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionLabel}>Categorias</Text>
          <Text style={s.sectionMeta}>{categoryCards.length} áreas</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.navy800} style={{ marginVertical: 24 }} />
        ) : filteredCategories.length === 0 ? (
          <EmptyState title="Nenhuma categoria encontrada" icon="albums-outline" />
        ) : (
          <View style={s.stack}>
                {filteredCategories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={s.categoryCard} activeOpacity={0.84} onPress={() => openCategory(cat.id)}>
                    <View style={[s.categoryIconBox, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={24} color={cat.color} />
                    </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.categoryTitleRow}>
                    <Text style={s.categoryTitle} numberOfLines={1}>{cat.nome}</Text>
                    {cat.premium && (
                      <View style={s.premiumChip}>
                        <Ionicons name="star-outline" size={9} color="#92400E" />
                        <Text style={s.premiumTxt}>Premium</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.categoryDesc} numberOfLines={1}>{cat.descricao}</Text>
                  <Text style={s.categoryMeta}>{cat.simCount} sim{cat.matCount > 0 ? ` · ${cat.matCount} mat` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.ink300} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function buildCategoryCards(
  categorias: CategoriaMaterial[],
  materiais: Material[],
): CategoryCard[] {
  if (categorias.length === 0) {
    const simCount = materiais.filter((m) => m.tipo === 'simulado').length
    const matCount = materiais.filter((m) => m.tipo !== 'simulado').length
    return FALLBACK_CATEGORIES.map((cat, index) => ({
      ...cat,
      simCount,
      matCount,
      isFallback: true,
    }))
  }

  return categorias.map((categoria, index) => {
    const visual = categoryVisual(categoria, index)
    const related = materiais.filter((m) => m.categoria_id === categoria.id)
    const simCount = related.filter((m) => m.tipo === 'simulado').length
    const matCount = related.filter((m) => m.tipo !== 'simulado').length
    return {
      id: categoria.id,
      nome: categoria.nome,
      descricao: categoria.descricao ?? 'Simulados e materiais desta área',
      icon: visual.icon,
      color: visual.color,
      bg: visual.bg,
      simCount,
      matCount,
    }
  })
}

function getCategoryName(categorias: CategoriaMaterial[], categoryId: string | null) {
  return categorias.find((c) => c.id === categoryId)?.nome ?? 'Simulados'
}

function TopPlainHeader({ title, eyebrow, onBack, rightIcon }: { title: string; eyebrow: string; onBack: () => void; rightIcon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.plainHeader}>
      <TouchableOpacity style={s.plainHeaderBtn} activeOpacity={0.82} onPress={onBack}>
        <Ionicons name="chevron-back" size={19} color={colors.ink900} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.plainHeaderEyebrow}>{eyebrow}</Text>
        <Text style={s.plainHeaderTitle}>{title}</Text>
      </View>
      {!!rightIcon && (
        <View style={s.plainHeaderBtn}>
          <Ionicons name={rightIcon} size={17} color={colors.ink700} />
        </View>
      )}
    </View>
  )
}

function StatMini({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={s.statMini}>
      <Ionicons name={icon} size={18} color={colors.navy800} />
      <Text style={s.statMiniValue}>{value}</Text>
      <Text style={s.statMiniLabel}>{label}</Text>
    </View>
  )
}

function ResultStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={s.resultStatCard}>
      <Text style={[s.resultStatNum, { color }]}>{value}</Text>
      <Text style={s.resultStatLabel}>{label}</Text>
    </View>
  )
}

function QuestionImageBlock({ url }: { url: string }) {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setHasError(false)
    setImageUri(null)

    resolveQuestionImageUrl(url)
      .then((resolvedUrl) => {
        if (!mounted) return
        setImageUri(resolvedUrl)
        setHasError(!resolvedUrl)
      })
      .catch(() => {
        if (!mounted) return
        setHasError(true)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [url])

  if (isLoading) {
    return (
      <View style={s.questionImageWrap}>
        <View style={s.questionImageState}>
          <ActivityIndicator color={colors.navy800} />
          <Text style={s.questionImageStateText}>Carregando imagem...</Text>
        </View>
      </View>
    )
  }

  if (hasError || !imageUri) {
    return (
      <View style={s.questionImageWrap}>
        <View style={s.questionImageState}>
          <Ionicons name="image-outline" size={28} color={colors.ink400} />
          <Text style={s.questionImageStateText}>Não foi possível carregar a imagem da questão.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={s.questionImageWrap}>
      <AppImage source={{ uri: imageUri }} style={s.questionImage} contentFit="contain" onError={() => setHasError(true)} />
    </View>
  )
}

function QuestionImagesBlock({ imagens }: { imagens: { url: string }[] }) {
  const urls = imagens.map((img) => img.url.trim()).filter((url) => url.length > 0)
  if (urls.length === 0) return null

  return (
    <View style={s.questionImagesStack}>
      {urls.map((url, index) => (
        <QuestionImageBlock key={`${url}-${index}`} url={url} />
      ))}
    </View>
  )
}

function BriefingRow({ icon, color, title, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; text: string }) {
  return (
    <View style={s.briefingRow}>
      <View style={[s.briefingIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.briefingTitle}>{title}</Text>
        <Text style={s.briefingText}>{text}</Text>
      </View>
    </View>
  )
}

function SimuladoRow({
  material,
  stats,
  onPress,
}: {
  material: Material
  stats?: { attempts: number; avgPct: number; bestPct: number; latest: ClienteSimuladoResultado | null }
  onPress: () => void
}) {
  const attempts = stats?.attempts ?? 0
  const avgPct = stats?.avgPct ?? 0
  const hasHistory = attempts > 0
  return (
    <TouchableOpacity style={[s.simuladoRow, hasHistory && s.simuladoRowActive]} activeOpacity={0.84} onPress={onPress}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.simuladoTitle} numberOfLines={1}>{material.titulo}</Text>
        <Text style={s.simuladoMeta} numberOfLines={1}>
          {material.descricao ?? `${material.duracao_min ?? 15} min`}
          {hasHistory ? ` · ${attempts} tentativas · ${avgPct}% acerto` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.ink300} />
    </TouchableOpacity>
  )
}

function StudyMaterialRow({ material, onPress }: { material: Material; onPress: () => void }) {
  const icon = material.tipo === 'pdf'
    ? 'document-text-outline'
    : material.tipo === 'video'
      ? 'play-circle-outline'
      : material.tipo === 'link'
        ? 'link-outline'
        : material.tipo === 'card'
          ? 'albums-outline'
          : 'book-outline'
  const color = material.tipo === 'pdf'
    ? colors.navy800
    : material.tipo === 'video'
      ? '#0891B2'
      : material.tipo === 'link'
        ? '#0F766E'
        : material.tipo === 'card'
          ? '#FB923C'
          : '#7E22CE'
  return (
    <TouchableOpacity style={s.studyRow} activeOpacity={0.84} onPress={onPress}>
      <View style={[s.studyIcon, { backgroundColor: `${color}16` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.studyTitle} numberOfLines={1}>{material.titulo}</Text>
        <Text style={s.studyMeta} numberOfLines={1}>{material.descricao ?? material.tipo.toUpperCase()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.ink300} />
    </TouchableOpacity>
  )
}

function HistoryRow({ item, onPress }: { item: HistoryItem; onPress: () => void }) {
  const pct = item.total > 0 ? Math.round((item.score / item.total) * 100) : 0
  const pass = pct >= 60
  return (
    <TouchableOpacity style={s.historyRow} activeOpacity={0.84} onPress={onPress}>
      <View style={[s.historyScoreCircle, { borderColor: pass ? colors.ok : colors.err }]}>
        <Text style={[s.historyScoreTxt, { color: pass ? colors.ok : colors.err }]}>{pct}%</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.historyTagRow}>
          <View style={s.historyTag}>
            <Text style={s.historyTagTxt}>{item.category}</Text>
          </View>
          <Text style={s.historyWhen}>· Tentativa {item.attempt}</Text>
        </View>
        <Text style={s.historyTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.historyMeta}>{formatShortDateTime(item.createdAt)} · {item.total} questões</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.ink300} />
    </TouchableOpacity>
  )
}

function EmptyState({ title, icon, compact }: { title: string; icon: keyof typeof Ionicons.glyphMap; compact?: boolean }) {
  return (
    <View style={[s.empty, compact && { paddingVertical: 20 }]}>
      <Ionicons name={icon} size={compact ? 24 : 34} color={colors.ink400} />
      <Text style={s.emptyTitle}>{title}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  safeExam: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  sectionPadded: { padding: 20, paddingBottom: 34 },
  stack: { gap: 10 },

  headerRow: { marginBottom: 14 },
  headerSub: { fontSize: 12, color: colors.ink500 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.ink900, letterSpacing: -0.5, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.ink50, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.ink100, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink900 },
  flagDot: { width: 14, height: 10, borderRadius: 5, backgroundColor: '#BC002D', borderWidth: 3, borderColor: colors.white },

  heroCard: { borderRadius: 20, padding: 16, marginBottom: 18, backgroundColor: colors.navy800, overflow: 'hidden' },
  heroCircle: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,.06)' },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,.75)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroMainRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 8 },
  heroPct: { fontSize: 36, fontWeight: '800', color: colors.white, letterSpacing: -1 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,.85)', paddingBottom: 5 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  heroStat: { fontSize: 11, color: 'rgba(255,255,255,.85)' },
  heroStatNum: { fontSize: 14, fontWeight: '800', color: colors.white },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.4)' },

  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  quickCardLarge: {
    flex: 1.45, backgroundColor: colors.white, borderRadius: 14, padding: 11,
    borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  quickCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 11,
    borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickEyebrow: { fontSize: 9.5, color: colors.ink400, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  quickTitle: { fontSize: 12, fontWeight: '700', color: colors.ink900, marginTop: 1 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  sectionMeta: { fontSize: 11.5, color: colors.ink500, fontWeight: '600' },

  categoryCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', alignItems: 'center', gap: 13,
  },
  categoryIconBox: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryTitle: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: colors.ink900, letterSpacing: -0.15 },
  categoryDesc: { fontSize: 11, color: colors.ink500, marginTop: 2, lineHeight: 15 },
  categoryMeta: { fontSize: 10, fontWeight: '700', color: colors.ink500 },
  premiumChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#FEF3C7' },
  premiumTxt: { fontSize: 9, fontWeight: '800', color: '#92400E' },

  categoryHero: { backgroundColor: colors.navy800, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, overflow: 'hidden' },
  preHero: { backgroundColor: colors.navy800, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 36, overflow: 'hidden' },
  heroOrbLarge: { position: 'absolute', right: -60, top: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,.05)' },
  preAmberOrb: { position: 'absolute', left: -40, bottom: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(251,191,36,.10)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  heroIconBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  heroTopLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,.86)' },
  categoryHeroTitleRow: { flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 14 },
  categoryHeroIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center' },
  categoryHeroTitle: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  categoryHeroDesc: { fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 3, lineHeight: 17 },
  heroMetricLabel: { fontSize: 10, color: 'rgba(255,255,255,.70)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  heroProgressLine: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  heroProgressNum: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -0.6 },
  heroProgressTxt: { fontSize: 11, color: 'rgba(255,255,255,.84)' },
  heroProgressBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.15)', overflow: 'hidden', marginTop: 6 },
  heroProgressFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 3 },

  simuladoRow: {
    backgroundColor: colors.white, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  simuladoRowActive: { borderColor: colors.navy100, shadowColor: colors.navy900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  simuladoTitle: { fontSize: 13, fontWeight: '700', color: colors.ink900, letterSpacing: -0.15 },
  simuladoMeta: { fontSize: 11, color: colors.ink500, marginTop: 3 },
  studyRow: {
    backgroundColor: colors.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.ink100,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  studyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  studyTitle: { fontSize: 13, fontWeight: '700', color: colors.ink900 },
  studyMeta: { fontSize: 11, color: colors.ink500, marginTop: 2 },

  preChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.18)', marginBottom: 10 },
  preChipTxt: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  preTitle: { fontSize: 24, fontWeight: '900', color: colors.white, letterSpacing: -0.7, lineHeight: 29, maxWidth: 290 },
  preDesc: { fontSize: 13, color: 'rgba(255,255,255,.86)', marginTop: 10, lineHeight: 20 },
  preBody: { paddingHorizontal: 20, paddingBottom: 34, marginTop: -22 },
  preStatsCard: {
    backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.ink100, marginBottom: 22,
    flexDirection: 'row', shadowColor: colors.navy900, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
  },
  statMini: { flex: 1, alignItems: 'center' },
  statMiniValue: { fontSize: 16, fontWeight: '800', color: colors.ink900, marginTop: 5, letterSpacing: -0.2 },
  statMiniLabel: { fontSize: 10.5, color: colors.ink500, marginTop: 1 },
  verticalDivider: { width: 1, backgroundColor: colors.ink100 },
  briefingList: { gap: 12, marginBottom: 22 },
  briefingRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  briefingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  briefingTitle: { fontSize: 13, fontWeight: '800', color: colors.ink900, letterSpacing: -0.1 },
  briefingText: { fontSize: 11.5, color: colors.ink500, marginTop: 2, lineHeight: 16 },
  settingBox: { backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, borderRadius: 13, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  settingLabel: { fontSize: 11.5, color: colors.ink700, fontWeight: '600' },
  settingOptionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  settingOptionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.navy100 },
  settingOptionBtnActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  settingOptionTxt: { fontSize: 11.5, fontWeight: '700', color: colors.ink700 },
  settingOptionTxtActive: { color: colors.white },
  tipBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 13, padding: 12, marginBottom: 18, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 11.5, color: '#92400E', lineHeight: 17 },
  primaryAction: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, backgroundColor: colors.navy800, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryActionTxt: { fontSize: 14, fontWeight: '800', color: colors.white },
  ghostAction: { alignItems: 'center', padding: 14, marginTop: 6 },
  ghostActionTxt: { fontSize: 13, fontWeight: '700', color: colors.ink500 },

  examHeader: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.ink100, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.white },
  examCloseBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
  examSub: { fontSize: 11, color: colors.ink500, marginBottom: 2 },
  examTitle: { fontSize: 15, fontWeight: '800', color: colors.ink900, letterSpacing: -0.2 },
  timerPill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FEF3C7', flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerTxt: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  examContent: { padding: 20, paddingBottom: 34 },
  examLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 74, gap: 12 },
  examLoadingTxt: { fontSize: 13, color: colors.ink500, fontWeight: '600' },
  emptyExam: { alignItems: 'center', justifyContent: 'center', paddingVertical: 54, paddingHorizontal: 18, backgroundColor: colors.ink50, borderRadius: 18, borderWidth: 1, borderColor: colors.ink100 },
  emptySub: { fontSize: 12, color: colors.ink400, textAlign: 'center', paddingTop: 8, lineHeight: 17 },
  examProgressBg: { height: 5, borderRadius: 3, backgroundColor: colors.ink200, overflow: 'hidden', marginBottom: 20 },
  examProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FBBF24' },
  questionIdTxt: { fontSize: 11, color: colors.ink400, marginTop: -10, marginBottom: 14, fontWeight: '600' },
  questionImagesStack: { gap: 12, marginBottom: 18 },
  questionImageWrap: { height: 180, borderRadius: 18, overflow: 'hidden', marginBottom: 20, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100 },
  questionImage: { width: '100%', height: '100%', backgroundColor: colors.navy50 },
  questionImageState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  questionImageStateText: { fontSize: 12, fontWeight: '700', color: colors.ink500, textAlign: 'center' },
  questionVisual: { borderRadius: 18, marginBottom: 20, padding: 18, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, flexDirection: 'row', alignItems: 'center', gap: 15 },
  questionVisualIcon: { width: 70, height: 70, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.navy900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  questionVisualLabel: { fontSize: 10.5, color: colors.navy800, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },
  questionVisualTitle: { fontSize: 13, color: colors.ink700, fontWeight: '700', lineHeight: 18 },
  questionLabel: { fontSize: 10.5, color: colors.ink400, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 },
  examQuestionText: { fontSize: 18, fontWeight: '700', color: colors.ink900, lineHeight: 27, letterSpacing: -0.25, marginBottom: 22 },
  examOptions: { gap: 10, marginBottom: 14 },
  examOption: { minHeight: 62, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink200, flexDirection: 'row', alignItems: 'center', gap: 12 },
  examOptionSelected: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  examOptionCorrect: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  examOptionWrong: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  examOptionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  examOptionTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink900, lineHeight: 20 },
  feedbackBox: { borderRadius: 16, padding: 13, marginBottom: 16, flexDirection: 'row', gap: 11, borderWidth: 1, backgroundColor: colors.navy50, borderColor: colors.navy100 },
  feedbackOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  feedbackErr: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  feedbackIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: colors.white },
  feedbackTitle: { fontSize: 12.5, fontWeight: '800', color: colors.navy800 },
  correctAnswersList: { gap: 7, marginTop: 8 },
  correctAnswerChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderColor: colors.navy100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.white },
  correctAnswerTxt: { flex: 1, fontSize: 12.5, fontWeight: '800', lineHeight: 17, color: colors.navy900 },
  feedbackText: { fontSize: 12, marginTop: 5, lineHeight: 17, opacity: 0.86, color: colors.ink700 },
  examFooter: { gap: 10, marginTop: 2 },
  reportBtn: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  reportTxt: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  confirmBtn: {
    borderRadius: 14,
    backgroundColor: colors.navy800,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  confirmBtnDisabled: { backgroundColor: colors.ink300 },
  confirmBtnConfirmed: { backgroundColor: '#0F766E' },
  confirmBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
  confirmBtnTxtDisabled: { color: colors.ink400 },
  questionNavRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prevBtn: { flex: 1, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  prevBtnDisabled: { backgroundColor: colors.ink50 },
  prevBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.ink700 },
  prevBtnTxtDisabled: { color: colors.ink400 },
  nextBtn: { minWidth: 126, borderRadius: 14, backgroundColor: colors.navy800, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  nextBtnDisabled: { backgroundColor: colors.ink300 },
  nextBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
  examFootnote: { textAlign: 'center', fontSize: 11, color: colors.ink400, marginTop: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(11,16,32,.46)', justifyContent: 'center', padding: 22 },
  reportModal: { backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.ink100, shadowColor: colors.navy900, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.18, shadowRadius: 30, elevation: 12 },
  reportModalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 14 },
  reportModalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reportModalTitle: { fontSize: 16, fontWeight: '900', color: colors.ink900, letterSpacing: -0.2 },
  reportModalSub: { fontSize: 12, color: colors.ink500, lineHeight: 17, marginTop: 2 },
  reportModalClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
  reportInput: { minHeight: 118, borderRadius: 14, borderWidth: 1.2, borderColor: colors.ink200, backgroundColor: colors.ink50, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: colors.ink900, lineHeight: 18 },
  reportCount: { alignSelf: 'flex-end', fontSize: 10.5, color: colors.ink400, marginTop: 6, marginBottom: 12 },
  reportModalActions: { flexDirection: 'row', gap: 10 },
  reportCancelBtn: { flex: 1, borderRadius: 13, paddingVertical: 13, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center' },
  reportCancelTxt: { fontSize: 13, fontWeight: '800', color: colors.ink700 },
  reportSubmitBtn: { flex: 1.2, borderRadius: 13, paddingVertical: 13, backgroundColor: colors.navy800, alignItems: 'center' },
  reportSubmitBtnDisabled: { backgroundColor: colors.ink300 },
  reportSubmitTxt: { fontSize: 13, fontWeight: '800', color: colors.white },
  reviewChoiceList: { gap: 10 },
  reviewChoiceBtn: { borderRadius: 14, borderWidth: 1, borderColor: colors.ink100, backgroundColor: colors.ink50, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewChoiceTitle: { fontSize: 13, fontWeight: '900', color: colors.ink900 },
  reviewChoiceSub: { fontSize: 11.5, color: colors.ink500, lineHeight: 16, marginTop: 2 },

  resultContent: { paddingBottom: 34 },
  resultHero: { backgroundColor: colors.navy800, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  resultBubble: { position: 'absolute', right: -62, top: -42, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,.06)' },
  resultTopbar: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  resultBackBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  resultHeader: { flex: 1, color: 'rgba(255,255,255,.88)', fontSize: 13, fontWeight: '700' },
  scoreRing: { alignItems: 'center', marginTop: 2 },
  scoreRingTrack: { width: 160, height: 160, borderRadius: 80, borderWidth: 10, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  scoreRingFill: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 10, borderColor: 'transparent', transform: [{ rotate: '35deg' }] },
  scoreRingInner: { alignItems: 'center' },
  scorePct: { color: colors.white, fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  scoreSub: { color: 'rgba(255,255,255,.84)', fontSize: 12, marginTop: 2 },
  resultBadge: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(251,191,36,.18)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultBadgeTxt: { color: '#FBBF24', fontSize: 12, fontWeight: '800' },
  resultStatsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: -15, marginBottom: 22 },
  resultStatCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 13, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center', shadowColor: colors.navy900, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  resultStatNum: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  resultStatLabel: { fontSize: 11, color: colors.ink500, marginTop: 2, fontWeight: '600' },
  reviewList: { gap: 9, paddingHorizontal: 20, marginBottom: 18 },
  reviewRow: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.ink100, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  reviewIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reviewTitle: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  reviewMeta: { fontSize: 11.5, color: colors.ink500, marginTop: 2 },
  reviewMetaSecondary: { fontSize: 11, color: colors.ink400, marginTop: 1 },
  reviewCorrectBlock: { marginTop: 4, gap: 4 },
  reviewCorrectList: { gap: 5 },
  reviewCorrectChip: { alignSelf: 'flex-start', maxWidth: '100%', fontSize: 11, lineHeight: 15, color: '#166534', fontWeight: '700', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  reviewSummaryCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.ink100, padding: 15, marginBottom: 14 },
  reviewSummaryTitle: { fontSize: 15, fontWeight: '900', color: colors.ink900, letterSpacing: -0.2 },
  reviewSummaryMeta: { fontSize: 12, color: colors.ink500, marginTop: 4, lineHeight: 17 },
  reviewFilterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reviewFilterBtn: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: colors.ink200, backgroundColor: colors.white, paddingVertical: 9, alignItems: 'center' },
  reviewFilterBtnActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  reviewFilterTxt: { fontSize: 12, fontWeight: '800', color: colors.ink700 },
  reviewFilterTxtActive: { color: colors.white },
  readOnlyReviewList: { gap: 14 },
  readOnlyQuestionCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.ink100, padding: 14 },
  readOnlyQuestionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  readOnlyIdTxt: { flex: 1, fontSize: 11, color: colors.ink400, fontWeight: '600' },
  readOnlyStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  readOnlyStatusOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  readOnlyStatusErr: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  readOnlyStatusTxt: { fontSize: 10.5, fontWeight: '900' },
  reviewQuestionTitle: { fontSize: 11, color: colors.ink400, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7 },
  resultActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  secondaryAction: { flex: 1, borderRadius: 14, paddingVertical: 14, backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100, alignItems: 'center' },
  secondaryActionTxt: { fontSize: 13, fontWeight: '800', color: colors.ink700 },

  plainHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  plainHeaderBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.ink100 },
  plainHeaderEyebrow: { fontSize: 11, color: colors.ink500 },
  plainHeaderTitle: { fontSize: 17, fontWeight: '800', color: colors.ink900, letterSpacing: -0.3 },
  historySummary: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  historyPills: { marginBottom: 14 },
  pillsRow: { flexDirection: 'row', gap: 7, paddingRight: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink200 },
  pillActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  pillTxt: { fontSize: 11.5, fontWeight: '700', color: colors.ink700 },
  pillTxtActive: { color: colors.white },
  historyRow: { backgroundColor: colors.white, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: colors.ink100, flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyScoreCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  historyScoreTxt: { fontSize: 12, fontWeight: '900', letterSpacing: -0.2 },
  historyTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  historyTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.navy50 },
  historyTagTxt: { fontSize: 9.5, fontWeight: '800', color: colors.navy800, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyWhen: { fontSize: 9.5, color: colors.ink400 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: colors.ink900, marginTop: 3 },
  historyMeta: { fontSize: 10.5, color: colors.ink500, marginTop: 3 },

  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink500, textAlign: 'center' },
})
