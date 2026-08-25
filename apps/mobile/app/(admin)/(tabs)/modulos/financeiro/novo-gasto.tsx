import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, storage } from '@/lib/firebase'
import { AppImage } from '@/components/AppImage'
import { createGasto, listAdminProfiles } from '@ueno/firebase/queries/financeiro'
import { uploadFile, gastoComprovantePath } from '@ueno/firebase/storage'
import { useAuthStore } from '@/stores/auth.store'
import { colors } from '@/theme'
import { format } from 'date-fns'
import type { FinalidadeGasto } from '@ueno/firebase/types'

type Funcionario = { id: string; full_name: string }

const FINALIDADES: { id: FinalidadeGasto; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'alimentacao', label: 'Alimentação', icon: 'restaurant-outline' },
  { id: 'transporte', label: 'Transporte', icon: 'car-outline' },
  { id: 'material', label: 'Material', icon: 'cube-outline' },
  { id: 'comunicacao', label: 'Comunicação', icon: 'chatbubble-outline' },
  { id: 'manutencao', label: 'Manutenção', icon: 'construct-outline' },
  { id: 'outros', label: 'Outros', icon: 'ellipsis-horizontal-outline' },
]

const FINALIDADE_COLOR: Record<FinalidadeGasto, string> = {
  alimentacao: '#EA580C',
  transporte: '#0891B2',
  material: colors.navy800,
  comunicacao: '#7E22CE',
  manutencao: '#CA8A04',
  outros: colors.ink400,
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>
}

export default function NovoGastoScreen() {
  const { session } = useAuthStore()
  const qc = useQueryClient()

  const [funcionario, setFuncionario] = useState<Funcionario | null>(null)
  const [showFuncOpts, setShowFuncOpts] = useState(false)
  const [finalidade, setFinalidade] = useState<FinalidadeGasto | null>(null)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(format(new Date(), 'dd/MM/yyyy'))
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: funcionarios, isLoading: loadingFuncs } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => listAdminProfiles(db),
  })

  const { mutate: salvar, isPending } = useMutation({
    mutationFn: async () => {
      if (!funcionario) throw new Error('Selecione um funcionário')
      if (!finalidade) throw new Error('Selecione uma finalidade')
      if (!descricao.trim()) throw new Error('Preencha a descrição')
      const valorNum = Number(valor.replace(/[^0-9]/g, ''))
      if (!valorNum) throw new Error('Informe um valor válido')

      const [dd, mm, yyyy] = data.split('/')
      const dataISO = `${yyyy}-${mm}-${dd}`

      let comprovante_url: string | null = null
      if (fotoUri) {
        setUploading(true)
        const resp = await fetch(fotoUri)
        const blob = await resp.blob()
        const fileName = fotoUri.split('/').pop() ?? 'comprovante.jpg'
        const path = gastoComprovantePath(fileName)
        comprovante_url = await uploadFile(storage, path, blob)
        setUploading(false)
      }

      return createGasto(db, {
        funcionario_id: funcionario.id,
        funcionario_nome: funcionario.full_name,
        finalidade,
        descricao: descricao.trim(),
        valor_jpy: valorNum,
        data: dataISO,
        comprovante_url,
        registrado_por: session?.userId ?? '',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gastos-mes'] })
      router.back()
    },
    onError: (e: Error) => {
      Alert.alert('Erro', e.message)
    },
  })

  const pickFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria nas configurações.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri)
    }
  }

  const canSave = !!funcionario && !!finalidade && descricao.trim() && valor && !isPending && !uploading

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Financeiro</Text>
          <Text style={s.headerTitle}>Registrar gasto</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Funcionário */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Funcionário" />
          <TouchableOpacity
            style={s.fieldWrap}
            activeOpacity={0.8}
            onPress={() => setShowFuncOpts((v) => !v)}
          >
            {loadingFuncs ? (
              <ActivityIndicator size="small" color={colors.navy800} />
            ) : (
              <>
                <Ionicons name="person-outline" size={14} color={colors.ink400} />
                <Text style={[s.fieldInput, !funcionario && { color: colors.ink400 }]}>
                  {funcionario?.full_name ?? 'Selecione o funcionário'}
                </Text>
                <Ionicons name={showFuncOpts ? 'chevron-up' : 'chevron-down'} size={14} color={colors.ink400} />
              </>
            )}
          </TouchableOpacity>
          {showFuncOpts && (
            <View style={s.dropdownCard}>
              {(funcionarios ?? []).map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[s.dropdownOpt, funcionario?.id === f.id && s.dropdownOptActive]}
                  onPress={() => { setFuncionario(f); setShowFuncOpts(false) }}
                >
                  <Text style={[s.dropdownOptTxt, funcionario?.id === f.id && s.dropdownOptTxtActive]}>
                    {f.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Finalidade */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Finalidade" />
          <View style={s.finalidadeGrid}>
            {FINALIDADES.map((f) => {
              const active = finalidade === f.id
              const cor = FINALIDADE_COLOR[f.id]
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[s.finalidadeChip, active && { backgroundColor: cor, borderColor: cor }]}
                  activeOpacity={0.8}
                  onPress={() => setFinalidade(f.id)}
                >
                  <Ionicons name={f.icon} size={14} color={active ? 'white' : colors.ink500} />
                  <Text style={[s.finalidadeChipTxt, active && { color: 'white' }]}>{f.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Descrição */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Descrição" />
          <View style={[s.fieldWrap, { alignItems: 'flex-start', minHeight: 80 }]}>
            <TextInput
              style={[s.fieldInput, { paddingTop: 2 }]}
              placeholder="Ex: Almoço reunião com instrutores"
              placeholderTextColor={colors.ink400}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Valor */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Valor (¥)" />
          <View style={s.fieldWrap}>
            <Text style={s.currencyPrefix}>¥</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="0"
              placeholderTextColor={colors.ink400}
              value={valor}
              onChangeText={(v: string) => setValor(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Data */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Data" />
          <View style={s.fieldWrap}>
            <Ionicons name="calendar-outline" size={14} color={colors.ink400} />
            <TextInput
              style={s.fieldInput}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.ink400}
              value={data}
              onChangeText={setData}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Comprovante */}
        <View style={s.fieldGroup}>
          <FieldLabel label="Comprovante (opcional)" />
          {fotoUri ? (
            <View style={s.fotoPreview}>
              <AppImage source={{ uri: fotoUri }} style={s.fotoImg} />
              <TouchableOpacity style={s.fotoRemove} onPress={() => setFotoUri(null)} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={24} color={colors.err} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.fotoPicker} onPress={pickFoto} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={22} color={colors.navy800} />
              <Text style={s.fotoPickerTxt}>Adicionar foto</Text>
              <Text style={s.fotoPickerSub}>galeria ou câmera</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[s.btnSalvar, !canSave && s.btnSalvarDisabled]}
          activeOpacity={0.8}
          onPress={() => salvar()}
          disabled={!canSave}
        >
          {isPending || uploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={s.btnSalvarTxt}>Salvar gasto</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
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
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 0 },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 10, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 6,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.white, borderRadius: 12, padding: 13,
    borderWidth: 1, borderColor: colors.ink100,
  },
  fieldInput: { flex: 1, fontSize: 13, color: colors.ink900 },
  currencyPrefix: { fontSize: 15, fontWeight: '600', color: colors.ink700 },

  dropdownCard: {
    backgroundColor: colors.white, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: colors.ink100, overflow: 'hidden',
  },
  dropdownOpt: { padding: 13, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  dropdownOptActive: { backgroundColor: colors.navy50 },
  dropdownOptTxt: { fontSize: 13, color: colors.ink700 },
  dropdownOptTxtActive: { color: colors.navy800, fontWeight: '600' },

  finalidadeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  finalidadeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100,
  },
  finalidadeChipTxt: { fontSize: 12, fontWeight: '500', color: colors.ink500 },

  fotoPreview: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  fotoImg: { width: '100%', height: 180, borderRadius: 14 },
  fotoRemove: { position: 'absolute', top: 8, right: 8 },

  fotoPicker: {
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.navy100, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 28,
  },
  fotoPickerTxt: { fontSize: 13, fontWeight: '600', color: colors.navy800 },
  fotoPickerSub: { fontSize: 11, color: colors.ink400 },

  btnSalvar: {
    backgroundColor: colors.navy800, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, marginTop: 8,
  },
  btnSalvarDisabled: { opacity: 0.4 },
  btnSalvarTxt: { fontSize: 14, fontWeight: '700', color: 'white' },
})
