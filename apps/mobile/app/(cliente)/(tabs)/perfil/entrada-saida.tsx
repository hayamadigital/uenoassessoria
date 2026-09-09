import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import {
  createEntradaSaida,
  deleteEntradaSaida,
  listEntradasSaidasByCliente,
  updateEntradaSaida,
} from '@ueno/firebase/queries/entradas_saidas'
import { entradaSaidaSchema } from '@ueno/utils/validators'
import { useAuthStore } from '@/stores/auth.store'
import { DateField } from '@/components/DateField'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'
import type { ClienteEntradaSaida, TipoEntradaSaida } from '@ueno/firebase'

const TIPOS: Array<{ value: TipoEntradaSaida; label: string }> = [
  { value: 'entrada', label: 'Entrada no Japão' },
  { value: 'saida', label: 'Saída do Japão' },
]

type Form = {
  data_viagem: string
  tipo: TipoEntradaSaida
  observacao: string
}

const DEFAULT_FORM: Form = { data_viagem: '', tipo: 'entrada', observacao: '' }

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function EntradaSaidaScreen() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ClienteEntradaSaida | 'new' | null>(null)
  const [form, setForm] = useState<Form>(DEFAULT_FORM)

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: registros, isLoading } = useQuery({
    queryKey: ['cliente', cliente?.id, 'entrada-saida'],
    queryFn: () => listEntradasSaidasByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const title = useMemo(
    () => (editing === 'new' ? 'Novo registro' : editing ? 'Editar registro' : 'Entrada e saída'),
    [editing],
  )

  function startNew() {
    setForm(DEFAULT_FORM)
    setEditing('new')
  }

  function startEdit(item: ClienteEntradaSaida) {
    setForm({ data_viagem: item.data_viagem, tipo: item.tipo, observacao: item.observacao ?? '' })
    setEditing(item)
  }

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      const parsed = entradaSaidaSchema.safeParse({
        data_viagem: form.data_viagem,
        tipo: form.tipo,
        observacao: form.observacao,
      })
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Informe a data da viagem.')
      }
      const payload = {
        data_viagem: form.data_viagem.trim(),
        tipo: form.tipo,
        observacao: emptyToNull(form.observacao),
      }
      if (editing === 'new') {
        await createEntradaSaida(db, { cliente_id: cliente.id, ...payload })
      } else if (editing) {
        await updateEntradaSaida(db, cliente.id, editing.id, payload)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'entrada-saida'] })
      setEditing(null)
      Alert.alert('Registro salvo', 'Seu histórico de viagens foi atualizado.')
    },
    onError: (error) => {
      Alert.alert('Nao foi possivel salvar', error instanceof Error ? error.message : 'Tente novamente.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (item: ClienteEntradaSaida) => {
      if (!cliente) return
      await deleteEntradaSaida(db, cliente.id, item.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'entrada-saida'] })
    },
  })

  function confirmDelete(item: ClienteEntradaSaida) {
    Alert.alert('Remover registro', `Deseja remover ${item.tipo === 'entrada' ? 'a entrada' : 'a saída'} de ${item.data_viagem}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMutation.mutate(item) },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader
        title={title}
        subtitle={`${(registros ?? []).length} registro(s)`}
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
              <Text style={s.label}>Tipo</Text>
              <View style={s.segment}>
                {TIPOS.map((option) => {
                  const active = form.tipo === option.value
                  return (
                    <TouchableOpacity key={option.value} style={[s.segmentItem, active && s.segmentActive]} onPress={() => updateField('tipo', option.value)}>
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <DateField label="Data da viagem" value={form.data_viagem} onChange={(v) => updateField('data_viagem', v)} />

              <View style={s.field}>
                <Text style={s.label}>Observação</Text>
                <TextInput
                  value={form.observacao}
                  onChangeText={(v: string) => updateField('observacao', v)}
                  placeholder="Motivo, voo, etc."
                  placeholderTextColor={colors.ink300}
                  multiline
                  style={[s.input, s.textarea]}
                />
              </View>

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
              {isLoading ? <Text style={s.empty}>Carregando registros...</Text> : null}
              {(registros ?? []).length === 0 && !isLoading ? (
                <View style={s.emptyCard}>
                  <Ionicons name="airplane-outline" size={24} color={colors.ink400} />
                  <Text style={s.emptyTitle}>Nenhum registro</Text>
                  <Text style={s.empty}>Registre suas entradas e saídas do Japão.</Text>
                </View>
              ) : null}
              {(registros ?? []).map((item) => (
                <View key={item.id} style={s.itemCard}>
                  <Ionicons
                    name={item.tipo === 'entrada' ? 'airplane' : 'airplane-outline'}
                    size={18}
                    color={item.tipo === 'entrada' ? colors.green : colors.amber}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.itemTitleRow}>
                      <Text style={s.itemTitle}>{item.data_viagem}</Text>
                      <Text style={[s.badge, item.tipo === 'saida' && s.amberBadge]}>
                        {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </Text>
                    </View>
                    {item.observacao ? <Text style={s.itemMeta} numberOfLines={2}>{item.observacao}</Text> : null}
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
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 12 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTitle: { color: colors.ink900, fontWeight: '900', fontSize: 14 },
  itemMeta: { color: colors.ink500, fontSize: 12.5, marginTop: 4 },
  badge: { color: colors.green800, backgroundColor: colors.green50, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontSize: 10.5, fontWeight: '900' },
  amberBadge: { color: '#8A5A00', backgroundColor: '#FBF0DA' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
})
