import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import {
  createHabilitacao,
  deleteHabilitacao,
  listHabilitacoesByCliente,
  updateHabilitacao,
} from '@ueno/firebase/queries/habilitacoes'
import { PAISES, getPaisByCode } from '@ueno/utils/paises'
import { habilitacaoSchema } from '@ueno/utils/validators'
import { useAuthStore } from '@/stores/auth.store'
import { DateField } from '@/components/DateField'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'
import type { ClienteHabilitacao, SituacaoHabilitacao } from '@ueno/firebase'

const PAIS_OPTIONS = PAISES.map((p) => ({ value: p.code, label: `${p.flag} ${p.nome}` }))
const SITUACOES: Array<{ value: SituacaoHabilitacao; label: string }> = [
  { value: 'positiva', label: 'Positiva' },
  { value: 'negativa', label: 'Negativa' },
]

type Form = {
  pais: string
  categoria: string
  nome_habilitacao: string
  numero: string
  data_emissao: string
  data_vencimento: string
  situacao: SituacaoHabilitacao
  observacoes: string
}

const DEFAULT_FORM: Form = {
  pais: 'BR',
  categoria: '',
  nome_habilitacao: '',
  numero: '',
  data_emissao: '',
  data_vencimento: '',
  situacao: 'positiva',
  observacoes: '',
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function paisLabel(code: string) {
  const p = getPaisByCode(code)
  return p ? `${p.flag} ${p.nome}` : code
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        multiline={multiline}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  )
}

export default function HabilitacoesScreen() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ClienteHabilitacao | 'new' | null>(null)
  const [form, setForm] = useState<Form>(DEFAULT_FORM)

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: habilitacoes, isLoading } = useQuery({
    queryKey: ['cliente', cliente?.id, 'habilitacoes'],
    queryFn: () => listHabilitacoesByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const title = useMemo(
    () => (editing === 'new' ? 'Nova habilitação' : editing ? 'Editar habilitação' : 'Habilitações'),
    [editing],
  )

  function startNew() {
    setForm(DEFAULT_FORM)
    setEditing('new')
  }

  function startEdit(item: ClienteHabilitacao) {
    setForm({
      pais: getPaisByCode(item.pais)?.code ?? item.pais,
      categoria: item.categoria ?? '',
      nome_habilitacao: item.nome_habilitacao ?? '',
      numero: item.numero ?? '',
      data_emissao: item.data_emissao ?? '',
      data_vencimento: item.data_vencimento ?? '',
      situacao: item.situacao,
      observacoes: item.observacoes ?? '',
    })
    setEditing(item)
  }

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      const parsed = habilitacaoSchema.safeParse({
        pais: form.pais,
        categoria: form.categoria,
        nome_habilitacao: form.nome_habilitacao,
        numero: form.numero,
        data_emissao: form.data_emissao,
        data_vencimento: form.data_vencimento,
        observacoes: form.observacoes,
        situacao: form.situacao,
      })
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Confira os campos.')
      }
      const payload = {
        pais: form.pais,
        categoria: emptyToNull(form.categoria),
        nome_habilitacao: emptyToNull(form.nome_habilitacao),
        numero: emptyToNull(form.numero),
        data_emissao: emptyToNull(form.data_emissao),
        data_vencimento: emptyToNull(form.data_vencimento),
        situacao: form.situacao,
        observacoes: emptyToNull(form.observacoes),
      }
      if (editing === 'new') {
        await createHabilitacao(db, { cliente_id: cliente.id, ...payload })
      } else if (editing) {
        await updateHabilitacao(db, cliente.id, editing.id, payload)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'habilitacoes'] })
      setEditing(null)
      Alert.alert('Habilitação salva', 'A lista de habilitações foi atualizada.')
    },
    onError: (error) => {
      Alert.alert('Nao foi possivel salvar', error instanceof Error ? error.message : 'Tente novamente.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (item: ClienteHabilitacao) => {
      if (!cliente) return
      await deleteHabilitacao(db, cliente.id, item.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'habilitacoes'] })
    },
  })

  function confirmDelete(item: ClienteHabilitacao) {
    Alert.alert('Remover habilitação', `Deseja remover a habilitação (${paisLabel(item.pais)})?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMutation.mutate(item) },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader
        title={title}
        subtitle={`${(habilitacoes ?? []).length} habilitação(ões)`}
        right={!editing ? (
          <TouchableOpacity style={s.addBtn} onPress={startNew}>
            <Ionicons name="add" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {editing ? (
            <View style={s.card}>
              <View style={s.field}>
                <Text style={s.label}>País</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionsRow}>
                  {PAIS_OPTIONS.map((option) => {
                    const active = form.pais === option.value
                    return (
                      <TouchableOpacity key={option.value} style={[s.option, active && s.optionActive]} onPress={() => updateField('pais', option.value)}>
                        <Text style={[s.optionText, active && s.optionTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>

              <Field label="Categoria" value={form.categoria} onChangeText={(v) => updateField('categoria', v)} placeholder="Ex: B, AB" />
              <Field label="Nome escrito na habilitação" value={form.nome_habilitacao} onChangeText={(v) => updateField('nome_habilitacao', v)} />
              <Field label="Número / ID" value={form.numero} onChangeText={(v) => updateField('numero', v)} />
              <DateField label="Data de emissão" value={form.data_emissao} onChange={(v) => updateField('data_emissao', v)} />
              <DateField label="Data de vencimento" value={form.data_vencimento} onChange={(v) => updateField('data_vencimento', v)} />

              <Text style={s.label}>Situação</Text>
              <View style={s.segment}>
                {SITUACOES.map((option) => {
                  const active = form.situacao === option.value
                  return (
                    <TouchableOpacity key={option.value} style={[s.segmentItem, active && s.segmentActive]} onPress={() => updateField('situacao', option.value)}>
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Field label="Observações" value={form.observacoes} onChangeText={(v) => updateField('observacoes', v)} multiline />

              <View style={s.actionsRow}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(null)}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, saveMutation.isPending && s.disabled]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Text style={s.saveText}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isLoading ? <Text style={s.empty}>Carregando habilitações...</Text> : null}
              {(habilitacoes ?? []).length === 0 && !isLoading ? (
                <View style={s.emptyCard}>
                  <Ionicons name="car-outline" size={24} color={colors.ink400} />
                  <Text style={s.emptyTitle}>Nenhuma habilitação cadastrada</Text>
                  <Text style={s.empty}>Cadastre sua CNH brasileira e outras habilitações.</Text>
                </View>
              ) : null}
              {(habilitacoes ?? []).map((item) => (
                <View key={item.id} style={s.itemCard}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.itemTitleRow}>
                      <Text style={s.itemTitle} numberOfLines={1}>{paisLabel(item.pais)}</Text>
                      {item.categoria ? <Text style={s.badge}>{item.categoria}</Text> : null}
                      <Text style={[s.badge, item.situacao === 'negativa' && s.redBadge]}>
                        {item.situacao === 'positiva' ? 'Positiva' : 'Negativa'}
                      </Text>
                    </View>
                    <Text style={s.itemMeta}>
                      {item.numero ? `Nº ${item.numero}` : 'Sem número'}
                      {item.data_vencimento ? ` · vence ${item.data_vencimento}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.iconBtn} onPress={() => startEdit(item)}>
                    <Ionicons name="pencil-outline" size={17} color={colors.navy800} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={17} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 12 },
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, paddingHorizontal: 12, color: colors.ink900, backgroundColor: colors.white, fontSize: 14 },
  textarea: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  optionsRow: { gap: 8, paddingRight: 8 },
  option: { borderWidth: 1, borderColor: colors.ink200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.white },
  optionActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  optionText: { color: colors.ink500, fontSize: 12.5, fontWeight: '700' },
  optionTextActive: { color: colors.navy800 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, overflow: 'hidden' },
  segmentItem: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  segmentActive: { backgroundColor: colors.navy50 },
  segmentText: { color: colors.ink500, fontSize: 12.5, fontWeight: '800' },
  segmentTextActive: { color: colors.navy800 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.ink200, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.ink700, fontWeight: '800' },
  saveBtn: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 24, gap: 6 },
  emptyTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  empty: { color: colors.ink500, fontSize: 13, textAlign: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 12 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTitle: { color: colors.ink900, fontWeight: '900', fontSize: 14 },
  itemMeta: { color: colors.ink500, fontSize: 12.5, marginTop: 4 },
  badge: { color: colors.navy800, backgroundColor: colors.navy50, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontSize: 10.5, fontWeight: '900' },
  redBadge: { color: colors.red, backgroundColor: '#FBEAEC' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
})
