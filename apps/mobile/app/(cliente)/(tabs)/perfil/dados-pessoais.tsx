import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import { getClienteByProfileId, updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { avatarPath } from '@ueno/firebase/storage'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'
import type { ClienteInsert, ProfissaoTipo } from '@ueno/firebase'

const PROFISSOES: Array<{ value: ProfissaoTipo; label: string }> = [
  { value: 'autonomo', label: 'Autonomo' },
  { value: 'nao_trabalha', label: 'Nao trabalha' },
  { value: 'empreiteira', label: 'Empreiteira' },
  { value: 'fabrica', label: 'Fabrica' },
  { value: 'outros', label: 'Outros' },
]

const NACIONALIDADES = ['Brasil', 'Japao', 'Portugal', 'Estados Unidos', 'Peru', 'Bolivia', 'Paraguai', 'Filipinas', 'Outros']

type Form = {
  full_name: string
  phone: string
  whatsapp: string
  nome_japones: string
  data_nascimento: string
  nacionalidade: string
  cpf: string
  zairyu_card: string
  visto_tipo: string
  visto_validade: string
  data_entrada_japao: string
  profissao_tipo: ProfissaoTipo | ''
  profissao_empresa: string
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  cnh_estado_emissor: string
  observacoes: string
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function localUriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => resolve(xhr.response)
    xhr.onerror = () => reject(new Error('Nao foi possivel ler o arquivo selecionado.'))
    xhr.responseType = 'blob'
    xhr.open('GET', uri, true)
    xhr.send(null)
  })
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'
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
        keyboardType={keyboardType}
        multiline={multiline}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  )
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T | ''
  onChange: (value: T | '') => void
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionsRow}>
        <TouchableOpacity style={[s.option, !value && s.optionActive]} onPress={() => onChange('')}>
          <Text style={[s.optionText, !value && s.optionTextActive]}>Selecionar</Text>
        </TouchableOpacity>
        {options.map((option) => {
          const active = value === option.value
          return (
            <TouchableOpacity key={option.value} style={[s.option, active && s.optionActive]} onPress={() => onChange(option.value)}>
              <Text style={[s.optionText, active && s.optionTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default function DadosPessoaisScreen() {
  const { session, setSession } = useAuthStore()
  const queryClient = useQueryClient()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [form, setForm] = useState<Form>({
    full_name: '',
    phone: '',
    whatsapp: '',
    nome_japones: '',
    data_nascimento: '',
    nacionalidade: '',
    cpf: '',
    zairyu_card: '',
    visto_tipo: '',
    visto_validade: '',
    data_entrada_japao: '',
    profissao_tipo: '',
    profissao_empresa: '',
    cnh_numero: '',
    cnh_categoria: '',
    cnh_validade: '',
    cnh_estado_emissor: '',
    observacoes: '',
  })

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  useEffect(() => {
    if (!cliente) return
    setForm({
      full_name: cliente.profile.full_name ?? '',
      phone: cliente.profile.phone ?? '',
      whatsapp: cliente.profile.whatsapp ?? '',
      nome_japones: cliente.nome_japones ?? '',
      data_nascimento: cliente.data_nascimento ?? '',
      nacionalidade: cliente.nacionalidade ?? '',
      cpf: cliente.cpf ?? '',
      zairyu_card: cliente.zairyu_card ?? '',
      visto_tipo: cliente.visto_tipo ?? '',
      visto_validade: cliente.visto_validade ?? '',
      data_entrada_japao: cliente.data_entrada_japao ?? '',
      profissao_tipo: cliente.profissao_tipo ?? '',
      profissao_empresa: cliente.profissao_empresa ?? '',
      cnh_numero: cliente.cnh_numero ?? '',
      cnh_categoria: cliente.cnh_categoria ?? '',
      cnh_validade: cliente.cnh_validade ?? '',
      cnh_estado_emissor: cliente.cnh_estado_emissor ?? '',
      observacoes: cliente.observacoes ?? '',
    })
  }, [cliente])

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handlePickAvatar() {
    if (!cliente || !session) return

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissao necessaria', 'Permita acesso a galeria nas configuracoes do aparelho.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      allowsMultipleSelection: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
      quality: 0.75,
    })
    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    const uri = asset.uri
    const previousPreview = avatarPreview
    setAvatarPreview(uri)

    try {
      setUploadingAvatar(true)
      const sourceName = asset.fileName ?? uri.split('/').pop() ?? 'avatar.jpg'
      const contentType = asset.mimeType ?? 'image/jpeg'
      const extFromMime = contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/png'
          ? 'png'
          : contentType === 'image/webp'
            ? 'webp'
            : null
      const ext = extFromMime ?? (sourceName.includes('.') ? sourceName.split('.').pop() : 'jpg')
      const ownerUid = auth.currentUser?.uid ?? cliente.profile_id
      const path = avatarPath(ownerUid, `cliente-${cliente.profile_id}-avatar-${Date.now()}.${ext}`)
      const storageRef = ref(storage, path)
      const blob = await localUriToBlob(uri)
      try {
        await uploadBytes(storageRef, blob, { contentType })
      } finally {
        ;(blob as Blob & { close?: () => void }).close?.()
      }
      const publicUrl = await getDownloadURL(storageRef)
      await updateProfile(db, cliente.profile_id, { avatar_url: publicUrl })
      setAvatarPreview(publicUrl)
      setSession({ ...session, avatarUrl: publicUrl })
      queryClient.setQueryData(['cliente', 'me', session.userId], (current: typeof cliente | undefined) => current
        ? { ...current, profile: { ...current.profile, avatar_url: publicUrl } }
        : current)
      await queryClient.invalidateQueries({ queryKey: ['cliente', 'me', session.userId] })
      Alert.alert('Foto atualizada', 'Sua foto de perfil foi salva.')
    } catch {
      setAvatarPreview(previousPreview)
      Alert.alert('Nao foi possivel enviar a foto', 'Tente novamente com outra imagem.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente || !session) return
      if (form.full_name.trim().length < 2) throw new Error('Nome completo obrigatorio')

      const clientePayload: Partial<ClienteInsert> = {
        nome_japones: emptyToNull(form.nome_japones),
        data_nascimento: emptyToNull(form.data_nascimento),
        nacionalidade: emptyToNull(form.nacionalidade),
        cpf: emptyToNull(form.cpf),
        zairyu_card: emptyToNull(form.zairyu_card),
        visto_tipo: emptyToNull(form.visto_tipo),
        visto_validade: emptyToNull(form.visto_validade),
        data_entrada_japao: emptyToNull(form.data_entrada_japao),
        profissao_tipo: form.profissao_tipo ? form.profissao_tipo : null,
        profissao_empresa: emptyToNull(form.profissao_empresa),
        cnh_numero: emptyToNull(form.cnh_numero),
        cnh_categoria: emptyToNull(form.cnh_categoria),
        cnh_validade: emptyToNull(form.cnh_validade),
        cnh_estado_emissor: emptyToNull(form.cnh_estado_emissor),
        observacoes: emptyToNull(form.observacoes),
      }

      await Promise.all([
        updateProfile(db, cliente.profile_id, {
          full_name: form.full_name.trim(),
          phone: emptyToNull(form.phone),
          whatsapp: emptyToNull(form.whatsapp),
        }),
        updateCliente(db, cliente.id, clientePayload),
      ])
    },
    onSuccess: async () => {
      if (session) {
        setSession({ ...session, fullName: form.full_name.trim() })
      }
      await queryClient.invalidateQueries({ queryKey: ['cliente', 'me', session?.userId] })
      Alert.alert('Dados salvos', 'Suas informacoes pessoais foram atualizadas.')
    },
    onError: (error) => {
      Alert.alert('Nao foi possivel salvar', error instanceof Error ? error.message : 'Confira os campos e tente novamente.')
    },
  })

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Dados pessoais" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {isLoading ? <Text style={s.loading}>Carregando dados...</Text> : null}

          <View style={s.photoCard}>
            <View style={s.photoWrap}>
              <Avatar name={form.full_name || session?.fullName || 'Cliente'} size={76} url={avatarPreview ?? cliente?.profile.avatar_url ?? session?.avatarUrl} />
              <TouchableOpacity style={s.photoBadge} onPress={handlePickAvatar} disabled={uploadingAvatar}>
                <Ionicons name="camera" size={15} color={colors.white} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.photoTitle}>Foto de perfil</Text>
              <Text style={s.photoSub}>{uploadingAvatar ? 'Enviando imagem...' : 'Toque para escolher uma foto da galeria.'}</Text>
            </View>
            <TouchableOpacity style={s.photoBtn} onPress={handlePickAvatar} disabled={uploadingAvatar}>
              <Text style={s.photoBtnText}>{uploadingAvatar ? 'Enviando' : 'Alterar'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="person-outline" size={18} color={colors.navy800} />
              <Text style={s.cardTitle}>Dados pessoais</Text>
            </View>
            <Field label="Nome completo" value={form.full_name} onChangeText={(v) => updateField('full_name', v)} />
            <Field label="Nome em japones" value={form.nome_japones} onChangeText={(v) => updateField('nome_japones', v)} placeholder="Katakana ou Kanji" />
            <Field label="Data de nascimento" value={form.data_nascimento} onChangeText={(v) => updateField('data_nascimento', v)} placeholder="AAAA-MM-DD" />
            <OptionGroup label="Nacionalidade" value={form.nacionalidade} onChange={(v) => updateField('nacionalidade', v)} options={NACIONALIDADES.map((n) => ({ value: n, label: n }))} />
            <Field label="CPF" value={form.cpf} onChangeText={(v) => updateField('cpf', v)} placeholder="000.000.000-00" keyboardType="number-pad" />
            <Field label="Telefone" value={form.phone} onChangeText={(v) => updateField('phone', v)} placeholder="+81 90 0000 0000" keyboardType="phone-pad" />
            <Field label="WhatsApp" value={form.whatsapp} onChangeText={(v) => updateField('whatsapp', v)} placeholder="+81 90 0000 0000" keyboardType="phone-pad" />
          </View>

          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="card-outline" size={18} color={colors.navy800} />
              <Text style={s.cardTitle}>Visto e documentos</Text>
            </View>
            <Field label="Zairyu Card / Japanese ID" value={form.zairyu_card} onChangeText={(v) => updateField('zairyu_card', v)} />
            <Field label="Tipo de visto" value={form.visto_tipo} onChangeText={(v) => updateField('visto_tipo', v)} placeholder="Conjuge, Trabalho, Estudante..." />
            <Field label="Validade do visto" value={form.visto_validade} onChangeText={(v) => updateField('visto_validade', v)} placeholder="AAAA-MM-DD" />
            <Field label="Entrada no Japao" value={form.data_entrada_japao} onChangeText={(v) => updateField('data_entrada_japao', v)} placeholder="AAAA-MM-DD" />
          </View>

          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="briefcase-outline" size={18} color={colors.navy800} />
              <Text style={s.cardTitle}>Profissao e CNH</Text>
            </View>
            <OptionGroup label="Tipo de trabalho" value={form.profissao_tipo} onChange={(v) => updateField('profissao_tipo', v)} options={PROFISSOES} />
            {form.profissao_tipo && form.profissao_tipo !== 'nao_trabalha' ? (
              <Field label="Empreiteira / fabrica / empresa" value={form.profissao_empresa} onChangeText={(v) => updateField('profissao_empresa', v)} />
            ) : null}
            <Field label="Numero da CNH" value={form.cnh_numero} onChangeText={(v) => updateField('cnh_numero', v)} />
            <Field label="Categoria" value={form.cnh_categoria} onChangeText={(v) => updateField('cnh_categoria', v)} placeholder="Ex: B, AB" />
            <Field label="Validade da CNH" value={form.cnh_validade} onChangeText={(v) => updateField('cnh_validade', v)} placeholder="AAAA-MM-DD" />
            <Field label="Estado emissor" value={form.cnh_estado_emissor} onChangeText={(v) => updateField('cnh_estado_emissor', v)} placeholder="Ex: SP" />
            <Field label="Observacoes" value={form.observacoes} onChangeText={(v) => updateField('observacoes', v)} multiline />
          </View>

          <TouchableOpacity style={[s.saveBtn, saveMutation.isPending && s.saveBtnDisabled]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Text style={s.saveText}>{saveMutation.isPending ? 'Salvando...' : 'Salvar alteracoes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  loading: { color: colors.ink500, textAlign: 'center', paddingVertical: 12 },
  photoCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoWrap: { position: 'relative' },
  photoBadge: { position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.navy800, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  photoTitle: { color: colors.ink900, fontSize: 15, fontWeight: '900' },
  photoSub: { color: colors.ink500, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  photoBtn: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  photoBtnText: { color: colors.navy800, fontSize: 12.5, fontWeight: '900' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, paddingHorizontal: 12, color: colors.ink900, backgroundColor: colors.white, fontSize: 14 },
  textarea: { minHeight: 96, paddingTop: 10, textAlignVertical: 'top' },
  optionsRow: { gap: 8, paddingRight: 8 },
  option: { borderWidth: 1, borderColor: colors.ink200, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.white },
  optionActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  optionText: { color: colors.ink500, fontSize: 12.5, fontWeight: '700' },
  optionTextActive: { color: colors.navy800 },
  saveBtn: { minHeight: 50, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '800' },
})
