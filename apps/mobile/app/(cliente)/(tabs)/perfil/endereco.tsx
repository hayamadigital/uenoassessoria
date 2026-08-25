import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getClienteByProfileId, updateCliente } from '@ueno/firebase/queries/clientes'
import { useAuthStore } from '@/stores/auth.store'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'

type Form = {
  cep_jp: string
  provincia_jp: string
  cidade_jp: string
  bairro_jp: string
  numero_bloco_jp: string
  apartamento_jp: string
  complemento_jp: string
  endereco_jp: string
  mapa_link_jp: string
}

interface ZipcloudResult {
  status: number
  message: string | null
  results: Array<{
    zipcode: string
    prefcode: string
    address1: string
    address2: string
    address3: string
  }> | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function mapsUrlFor(form: Form) {
  const fullAddress = form.endereco_jp.trim()
  const address = fullAddress || [
    form.provincia_jp,
    form.cidade_jp,
    form.bairro_jp,
    form.numero_bloco_jp,
    form.apartamento_jp,
  ].filter(Boolean).join(' ')
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : ''
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
  keyboardType?: 'default' | 'number-pad' | 'url'
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
        autoCapitalize="none"
        multiline={multiline}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  )
}

export default function EnderecoScreen() {
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const [cepLoading, setCepLoading] = useState(false)
  const [form, setForm] = useState<Form>({
    cep_jp: '',
    provincia_jp: '',
    cidade_jp: '',
    bairro_jp: '',
    numero_bloco_jp: '',
    apartamento_jp: '',
    complemento_jp: '',
    endereco_jp: '',
    mapa_link_jp: '',
  })

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  useEffect(() => {
    if (!cliente) return
    setForm({
      cep_jp: cliente.cep_jp ?? '',
      provincia_jp: cliente.provincia_jp ?? '',
      cidade_jp: cliente.cidade_jp ?? '',
      bairro_jp: cliente.bairro_jp ?? '',
      numero_bloco_jp: cliente.numero_bloco_jp ?? '',
      apartamento_jp: cliente.apartamento_jp ?? '',
      complemento_jp: cliente.complemento_jp ?? '',
      endereco_jp: cliente.endereco_jp ?? '',
      mapa_link_jp: cliente.mapa_link_jp ?? '',
    })
  }, [cliente])

  const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function buscarCep() {
    const cep = form.cep_jp.replace(/[^0-9]/g, '')
    if (cep.length !== 7) {
      Alert.alert('CEP invalido', 'Digite o CEP japones com 7 numeros.')
      return
    }

    setCepLoading(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cep}`)
      const json = await res.json() as ZipcloudResult
      const result = json.results?.[0]
      if (!result) {
        Alert.alert('CEP nao encontrado', 'Confira o numero e tente novamente.')
        return
      }
      const next = {
        ...form,
        provincia_jp: result.address1,
        cidade_jp: result.address2,
        bairro_jp: result.address3 ?? form.bairro_jp,
      }
      setForm({ ...next, mapa_link_jp: mapsUrlFor(next) })
    } catch {
      Alert.alert('Erro ao buscar CEP', 'Verifique sua conexao e tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      const link = form.mapa_link_jp.trim() || mapsUrlFor(form)
      await updateCliente(db, cliente.id, {
        cep_jp: emptyToNull(form.cep_jp),
        provincia_jp: emptyToNull(form.provincia_jp),
        cidade_jp: emptyToNull(form.cidade_jp),
        bairro_jp: emptyToNull(form.bairro_jp),
        numero_bloco_jp: emptyToNull(form.numero_bloco_jp),
        apartamento_jp: emptyToNull(form.apartamento_jp),
        complemento_jp: emptyToNull(form.complemento_jp),
        endereco_jp: emptyToNull(form.endereco_jp),
        mapa_link_jp: emptyToNull(link),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cliente', 'me', session?.userId] })
      Alert.alert('Endereco salvo', 'Seu endereco no Japao foi atualizado.')
    },
    onError: () => {
      Alert.alert('Nao foi possivel salvar', 'Confira os dados e tente novamente.')
    },
  })

  const openMaps = () => {
    const url = form.mapa_link_jp.trim() || mapsUrlFor(form)
    if (!url) {
      Alert.alert('Sem endereco', 'Preencha o endereco antes de abrir o mapa.')
      return
    }
    Linking.openURL(url)
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Endereço no Japão" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {isLoading ? <Text style={s.loading}>Carregando endereco...</Text> : null}

          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="location-outline" size={18} color={colors.navy800} />
              <Text style={s.cardTitle}>Endereco no Japao</Text>
            </View>
            <View style={s.inline}>
              <View style={{ flex: 1 }}>
                <Field label="CEP" value={form.cep_jp} onChangeText={(v) => updateField('cep_jp', v)} placeholder="000-0000" keyboardType="number-pad" />
              </View>
              <TouchableOpacity style={s.secondaryBtn} onPress={buscarCep} disabled={cepLoading}>
                <Text style={s.secondaryText}>{cepLoading ? 'Buscando...' : 'Buscar'}</Text>
              </TouchableOpacity>
            </View>
            <Field label="Provincia" value={form.provincia_jp} onChangeText={(v) => updateField('provincia_jp', v)} />
            <Field label="Cidade" value={form.cidade_jp} onChangeText={(v) => updateField('cidade_jp', v)} />
            <Field label="Bairro" value={form.bairro_jp} onChangeText={(v) => updateField('bairro_jp', v)} />
            <Field label="Numero / bloco" value={form.numero_bloco_jp} onChangeText={(v) => updateField('numero_bloco_jp', v)} />
            <Field label="Apartamento" value={form.apartamento_jp} onChangeText={(v) => updateField('apartamento_jp', v)} />
            <Field label="Complemento" value={form.complemento_jp} onChangeText={(v) => updateField('complemento_jp', v)} />
            <Field
              label="Endereço completo em japonês"
              value={form.endereco_jp}
              onChangeText={(v) => updateField('endereco_jp', v)}
              placeholder="愛知県名古屋市中区栄1丁目2-3 ○○マンション101"
              multiline
            />
            <Field label="Link do Google Maps" value={form.mapa_link_jp} onChangeText={(v) => updateField('mapa_link_jp', v)} placeholder="https://maps.google.com/..." keyboardType="url" />
            <TouchableOpacity style={s.mapBtn} onPress={openMaps}>
              <Ionicons name="map-outline" size={16} color={colors.navy800} />
              <Text style={s.mapText}>Abrir no mapa</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.saveBtn, saveMutation.isPending && s.saveBtnDisabled]} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Text style={s.saveText}>{saveMutation.isPending ? 'Salvando...' : 'Salvar endereco'}</Text>
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
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, paddingHorizontal: 12, color: colors.ink900, backgroundColor: colors.white, fontSize: 14 },
  textarea: { minHeight: 86, paddingTop: 10, textAlignVertical: 'top' },
  inline: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  secondaryBtn: { height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.navy50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.navy100 },
  secondaryText: { color: colors.navy800, fontWeight: '800', fontSize: 13 },
  mapBtn: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.navy100, backgroundColor: colors.navy50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapText: { color: colors.navy800, fontWeight: '800', fontSize: 13 },
  saveBtn: { minHeight: 50, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '800' },
})
