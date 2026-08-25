import { useEffect, useState } from 'react'
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getQuestaoWithDetails, updateQuestao } from '@ueno/firebase/queries/questoes'
import { colors } from '@/theme'
import type { QuestaoWithDetails, TipoOpcaoQuestao } from '@ueno/firebase'

type OptionDraft = {
  texto: string
  is_correta: boolean
  ordem: number
}

function questionIdentifier(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function buildInitialOptions(questao: QuestaoWithDetails): OptionDraft[] {
  if (questao.opcoes.length > 0) {
    return questao.opcoes
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((op, index) => ({
        texto: op.texto,
        is_correta: op.is_correta,
        ordem: index,
      }))
  }
  return [
    { texto: 'Verdadeiro', is_correta: true, ordem: 0 },
    { texto: 'Falso', is_correta: false, ordem: 1 },
  ]
}

export default function EditarQuestaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [enunciado, setEnunciado] = useState('')
  const [explicacao, setExplicacao] = useState('')
  const [tipoOpcao, setTipoOpcao] = useState<TipoOpcaoQuestao>('booleano')
  const [opcoes, setOpcoes] = useState<OptionDraft[]>([])

  const { data: questao, isLoading } = useQuery({
    queryKey: ['admin-editar-questao', id],
    queryFn: () => getQuestaoWithDetails(db, id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (!questao) return
    setEnunciado(questao.enunciado)
    setExplicacao(questao.explicacao ?? '')
    setTipoOpcao(questao.tipo_opcao)
    setOpcoes(buildInitialOptions(questao))
  }, [questao])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!questao) throw new Error('Questão não carregada')
      const cleanOptions = opcoes
        .map((op, index) => ({ texto: op.texto.trim(), is_correta: op.is_correta, ordem: index }))
        .filter((op) => op.texto.length > 0)
      return updateQuestao(
        db,
        questao.id,
        {
          enunciado: enunciado.trim(),
          explicacao: explicacao.trim() || null,
          tipo_opcao: tipoOpcao,
          categoria_id: null,
        },
        cleanOptions,
        questao.imagens.map((img, index) => ({ url: img.url, ordem: index })),
        questao.explicacao_imagens.map((img, index) => ({ url: img.url, ordem: index })),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consultar-questao'] })
      queryClient.invalidateQueries({ queryKey: ['admin-editar-questao', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-materia-simulado-questoes'] })
      Alert.alert('Questão salva', 'As alterações foram aplicadas.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err) => {
      Alert.alert('Erro ao salvar', err instanceof Error ? err.message : String(err))
    },
  })

  const setTipo = (tipo: TipoOpcaoQuestao) => {
    setTipoOpcao(tipo)
    if (tipo === 'booleano') {
      setOpcoes([
        { texto: 'Verdadeiro', is_correta: true, ordem: 0 },
        { texto: 'Falso', is_correta: false, ordem: 1 },
      ])
    } else if (opcoes.length < 2) {
      setOpcoes([
        { texto: '', is_correta: false, ordem: 0 },
        { texto: '', is_correta: false, ordem: 1 },
      ])
    }
  }

  const updateOptionText = (index: number, value: string) => {
    setOpcoes((prev) => prev.map((op, i) => (i === index ? { ...op, texto: value } : op)))
  }

  const toggleCorrect = (index: number) => {
    setOpcoes((prev) => {
      if (tipoOpcao === 'booleano') {
        return prev.map((op, i) => ({ ...op, is_correta: i === index }))
      }
      return prev.map((op, i) => (i === index ? { ...op, is_correta: !op.is_correta } : op))
    })
  }

  const addOption = () => {
    if (opcoes.length >= 5) return
    setOpcoes((prev) => [...prev, { texto: '', is_correta: false, ordem: prev.length }])
  }

  const removeOption = (index: number) => {
    if (opcoes.length <= 2) return
    setOpcoes((prev) => prev.filter((_, i) => i !== index).map((op, i) => ({ ...op, ordem: i })))
  }

  const canSave =
    enunciado.trim().length >= 5 &&
    opcoes.filter((op) => op.texto.trim().length > 0).length >= 2 &&
    opcoes.some((op) => op.is_correta)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headerSub}>{id ? `ID ${questionIdentifier(id)}` : 'Questão'}</Text>
          <Text style={s.headerTitle}>Editar questão</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, (!canSave || saveMutation.isPending) && s.saveBtnDisabled]}
          disabled={!canSave || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="checkmark" size={18} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.navy800} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>ENUNCIADO</Text>
          <TextInput
            style={[s.input, s.textArea]}
            multiline
            value={enunciado}
            onChangeText={setEnunciado}
            placeholder="Texto da pergunta"
            placeholderTextColor={colors.ink400}
          />

          <Text style={s.sectionLabel}>TIPO DE RESPOSTA</Text>
          <View style={s.segment}>
            {([
              ['booleano', 'V / F'],
              ['multipla', 'Múltipla'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[s.segmentBtn, tipoOpcao === value && s.segmentBtnActive]}
                onPress={() => setTipo(value)}
                activeOpacity={0.82}
              >
                <Text style={[s.segmentTxt, tipoOpcao === value && s.segmentTxtActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.optionsHeader}>
            <Text style={s.sectionLabel}>OPÇÕES</Text>
            {tipoOpcao === 'multipla' && opcoes.length < 5 && (
              <TouchableOpacity style={s.addOptionBtn} onPress={addOption}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.addOptionTxt}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 9 }}>
            {opcoes.map((op, index) => (
              <View key={index} style={s.optionCard}>
                <TouchableOpacity style={s.correctBtn} onPress={() => toggleCorrect(index)}>
                  <Ionicons
                    name={op.is_correta ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={op.is_correta ? '#16A34A' : colors.ink300}
                  />
                </TouchableOpacity>
                <TextInput
                  style={s.optionInput}
                  value={op.texto}
                  onChangeText={(value: string) => updateOptionText(index, value)}
                  editable={tipoOpcao !== 'booleano'}
                  placeholder={`Opção ${index + 1}`}
                  placeholderTextColor={colors.ink400}
                />
                {tipoOpcao === 'multipla' && opcoes.length > 2 && (
                  <TouchableOpacity style={s.removeBtn} onPress={() => removeOption(index)}>
                    <Ionicons name="trash-outline" size={16} color={colors.err} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <Text style={s.sectionLabel}>EXPLICAÇÃO</Text>
          <TextInput
            style={[s.input, s.textAreaSmall]}
            multiline
            value={explicacao}
            onChangeText={setExplicacao}
            placeholder="Explique a resposta correta"
            placeholderTextColor={colors.ink400}
          />

          {questao?.imagens?.length ? (
            <View style={s.infoBox}>
              <Ionicons name="image-outline" size={16} color={colors.ink500} />
              <Text style={s.infoText}>
                Esta questão tem {questao.imagens.length} imagem(ns). Elas serão preservadas ao salvar.
              </Text>
            </View>
          ) : null}
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
  saveBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 9, marginTop: 14,
  },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: colors.ink900,
  },
  textArea: { minHeight: 112, textAlignVertical: 'top', lineHeight: 19 },
  textAreaSmall: { minHeight: 92, textAlignVertical: 'top', lineHeight: 19 },
  segment: {
    flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1,
    borderColor: colors.ink100, borderRadius: 13, padding: 4,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segmentBtnActive: { backgroundColor: colors.navy800 },
  segmentTxt: { fontSize: 12, fontWeight: '700', color: colors.ink500 },
  segmentTxtActive: { color: colors.white },
  optionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navy50,
  },
  addOptionTxt: { fontSize: 11, fontWeight: '700', color: colors.navy800 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.ink100,
    paddingHorizontal: 10, paddingVertical: 9,
  },
  correctBtn: { width: 28, alignItems: 'center', justifyContent: 'center' },
  optionInput: { flex: 1, fontSize: 13, color: colors.ink900, paddingVertical: 4 },
  removeBtn: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
    padding: 12, marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.ink500, lineHeight: 17 },
})
