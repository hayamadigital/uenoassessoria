import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { createContato, deleteContato, listContatosByCliente, updateContato } from '@ueno/firebase/queries/contatos'
import { useAuthStore } from '@/stores/auth.store'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'
import type { ClienteContato, TipoResponsavelContato } from '@ueno/firebase'

const DDIS = ['+81', '+55', '+1', '+351', '+595', '+51', '+63']
const TIPO_LABEL: Record<TipoResponsavelContato, string> = {
  pessoal: 'Pessoal',
  parente: 'Parente',
  terceiros: 'Terceiros',
}
const TIPOS: TipoResponsavelContato[] = ['pessoal', 'parente', 'terceiros']

type Form = {
  ddi: string
  numero: string
  tipo_responsavel: TipoResponsavelContato
  nome_responsavel: string
  relacao: string
  tem_whatsapp: boolean
  is_principal: boolean
}

const DEFAULT_FORM: Form = {
  ddi: '+81',
  numero: '',
  tipo_responsavel: 'pessoal',
  nome_responsavel: '',
  relacao: '',
  tem_whatsapp: true,
  is_principal: false,
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        style={s.input}
      />
    </View>
  )
}

export default function ContatosScreen() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ClienteContato | 'new' | null>(null)
  const [form, setForm] = useState<Form>(DEFAULT_FORM)

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: contatos, isLoading } = useQuery({
    queryKey: ['cliente', cliente?.id, 'contatos'],
    queryFn: () => listContatosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const title = useMemo(() => editing === 'new' ? 'Novo contato' : editing ? 'Editar contato' : 'Contatos', [editing])

  function startNew() {
    setForm({ ...DEFAULT_FORM, is_principal: (contatos ?? []).length === 0 })
    setEditing('new')
  }

  function startEdit(contato: ClienteContato) {
    setForm({
      ddi: contato.ddi,
      numero: contato.numero,
      tipo_responsavel: contato.tipo_responsavel,
      nome_responsavel: contato.nome_responsavel ?? '',
      relacao: contato.relacao ?? '',
      tem_whatsapp: contato.tem_whatsapp,
      is_principal: contato.is_principal,
    })
    setEditing(contato)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      if (!form.numero.trim()) throw new Error('Informe o numero de telefone.')
      const payload = {
        ddi: form.ddi,
        numero: form.numero.trim(),
        tipo_responsavel: form.tipo_responsavel,
        nome_responsavel: emptyToNull(form.nome_responsavel),
        relacao: emptyToNull(form.relacao),
        tem_whatsapp: form.tem_whatsapp,
        is_principal: form.is_principal,
      }
      if (editing === 'new') {
        await createContato(db, { cliente_id: cliente.id, ...payload })
      } else if (editing) {
        await updateContato(db, cliente.id, editing.id, payload)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'contatos'] })
      setEditing(null)
      Alert.alert('Contato salvo', 'A lista de contatos foi atualizada.')
    },
    onError: (error) => {
      Alert.alert('Nao foi possivel salvar', error instanceof Error ? error.message : 'Tente novamente.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (contato: ClienteContato) => {
      if (!cliente) return
      await deleteContato(db, cliente.id, contato.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'contatos'] })
    },
  })

  function confirmDelete(contato: ClienteContato) {
    Alert.alert('Remover contato', `Deseja remover ${contato.ddi} ${contato.numero}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeMutation.mutate(contato) },
    ])
  }

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader
        title={title}
        subtitle={`${(contatos ?? []).length} contato(s) cadastrado(s)`}
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
              <Text style={s.label}>DDI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionsRow}>
                {DDIS.map((ddi) => {
                  const active = form.ddi === ddi
                  return (
                    <TouchableOpacity key={ddi} style={[s.option, active && s.optionActive]} onPress={() => updateField('ddi', ddi)}>
                      <Text style={[s.optionText, active && s.optionTextActive]}>{ddi}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <Field label="Numero" value={form.numero} onChangeText={(v) => updateField('numero', v)} placeholder="90 0000-0000" />

              <Text style={s.label}>Responsavel</Text>
              <View style={s.segment}>
                {TIPOS.map((tipo) => {
                  const active = form.tipo_responsavel === tipo
                  return (
                    <TouchableOpacity key={tipo} style={[s.segmentItem, active && s.segmentActive]} onPress={() => updateField('tipo_responsavel', tipo)}>
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>{TIPO_LABEL[tipo]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {form.tipo_responsavel !== 'pessoal' ? (
                <>
                  <Field label="Nome do responsavel" value={form.nome_responsavel} onChangeText={(v) => updateField('nome_responsavel', v)} />
                  <Field label="Relacao" value={form.relacao} onChangeText={(v) => updateField('relacao', v)} placeholder="Esposa, filho, amigo..." />
                </>
              ) : null}

              <View style={s.switchRow}>
                <View>
                  <Text style={s.switchTitle}>Tem WhatsApp</Text>
                  <Text style={s.switchSub}>Usar este numero para mensagens</Text>
                </View>
                <Switch value={form.tem_whatsapp} onValueChange={(v: boolean) => updateField('tem_whatsapp', v)} trackColor={{ true: colors.navy100, false: colors.ink200 }} thumbColor={form.tem_whatsapp ? colors.navy800 : colors.ink400} />
              </View>

              <View style={s.switchRow}>
                <View>
                  <Text style={s.switchTitle}>Contato principal</Text>
                  <Text style={s.switchSub}>Prioridade para atendimento</Text>
                </View>
                <Switch value={form.is_principal} onValueChange={(v: boolean) => updateField('is_principal', v)} trackColor={{ true: colors.navy100, false: colors.ink200 }} thumbColor={form.is_principal ? colors.navy800 : colors.ink400} />
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
              {isLoading ? <Text style={s.empty}>Carregando contatos...</Text> : null}
              {(contatos ?? []).length === 0 && !isLoading ? (
                <View style={s.emptyCard}>
                  <Ionicons name="call-outline" size={24} color={colors.ink400} />
                  <Text style={s.emptyTitle}>Nenhum contato cadastrado</Text>
                  <Text style={s.empty}>Adicione seu telefone principal e WhatsApp.</Text>
                </View>
              ) : null}
              {(contatos ?? []).map((contato) => (
                <View key={contato.id} style={s.contactCard}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.contactTitleRow}>
                      <Text style={s.contactNumber} numberOfLines={1}>{contato.ddi} {contato.numero}</Text>
                      {contato.is_principal ? <Text style={s.badge}>Principal</Text> : null}
                      {contato.tem_whatsapp ? <Text style={[s.badge, s.greenBadge]}>WhatsApp</Text> : null}
                    </View>
                    <Text style={s.contactMeta}>
                      {TIPO_LABEL[contato.tipo_responsavel]}
                      {contato.nome_responsavel ? ` - ${contato.nome_responsavel}` : ''}
                      {contato.relacao ? ` (${contato.relacao})` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.iconBtn} onPress={() => startEdit(contato)}>
                    <Ionicons name="pencil-outline" size={17} color={colors.navy800} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => confirmDelete(contato)}>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { color: colors.ink900, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.ink500, fontSize: 12.5, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 12 },
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, paddingHorizontal: 12, color: colors.ink900, backgroundColor: colors.white, fontSize: 14 },
  optionsRow: { gap: 8, paddingRight: 8 },
  option: { borderWidth: 1, borderColor: colors.ink200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.white },
  optionActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  optionText: { color: colors.ink500, fontSize: 12.5, fontWeight: '800' },
  optionTextActive: { color: colors.navy800 },
  segment: { flexDirection: 'row', borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, overflow: 'hidden' },
  segmentItem: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  segmentActive: { backgroundColor: colors.navy50 },
  segmentText: { color: colors.ink500, fontSize: 12.5, fontWeight: '800' },
  segmentTextActive: { color: colors.navy800 },
  switchRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.ink100, paddingTop: 12, gap: 12 },
  switchTitle: { color: colors.ink900, fontSize: 13.5, fontWeight: '800' },
  switchSub: { color: colors.ink500, fontSize: 12, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelBtn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.ink200, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.ink700, fontWeight: '800' },
  saveBtn: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 24, gap: 6 },
  emptyTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  empty: { color: colors.ink500, fontSize: 13, textAlign: 'center' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 12 },
  contactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  contactNumber: { color: colors.ink900, fontWeight: '900', fontSize: 14 },
  contactMeta: { color: colors.ink500, fontSize: 12.5, marginTop: 4 },
  badge: { color: colors.navy800, backgroundColor: colors.navy50, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, fontSize: 10.5, fontWeight: '900' },
  greenBadge: { color: colors.green, backgroundColor: '#EAF8EE' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
})
