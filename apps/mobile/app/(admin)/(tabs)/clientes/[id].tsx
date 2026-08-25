import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import { getCliente, updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { createContato, deleteContato, listContatosByCliente, updateContato } from '@ueno/firebase/queries/contatos'
import { createHabilitacao, deleteHabilitacao, listHabilitacoesByCliente, updateHabilitacao } from '@ueno/firebase/queries/habilitacoes'
import { createEntradaSaida, deleteEntradaSaida, listEntradasSaidasByCliente, updateEntradaSaida } from '@ueno/firebase/queries/entradas_saidas'
import { listPagamentos } from '@ueno/firebase/queries/financeiro'
import { getClienteDocumentos } from '@ueno/firebase/queries/documentos'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { avatarPath } from '@ueno/firebase/storage'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  ClienteContatoInsert,
  ClienteEntradaSaidaInsert,
  ClienteHabilitacaoInsert,
  ClienteInsert,
  ProfileInsert,
  StatusProcesso,
} from '@ueno/firebase'

function safeDate(value: string | null, fmt: string, locale?: object): string | null {
  if (!value) return null
  try {
    const d = parseISO(value)
    if (isValid(d)) return format(d, fmt, locale ? { locale: locale as any } : undefined)
    const d2 = new Date(value)
    if (isValid(d2)) return format(d2, fmt, locale ? { locale: locale as any } : undefined)
    return value
  } catch {
    return value
  }
}

const STATUS_LABEL: Record<StatusProcesso, string> = {
  prospect: 'Prospect',
  contato: 'Contato',
  documentacao: 'Documentação',
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<StatusProcesso, string> = {
  prospect: '#94A3B8',
  contato: '#0891B2',
  documentacao: colors.warn,
  agendado: '#7C3AED',
  em_andamento: colors.navy600,
  aprovado: colors.ok,
  concluido: '#0F766E',
  cancelado: colors.err,
}

const PROFISSAO_LABEL: Record<string, string> = {
  autonomo: 'Autônomo',
  nao_trabalha: 'Não trabalha',
  empreiteira: 'Empreiteira',
  fabrica: 'Fábrica',
  outros: 'Outros',
}

const TIPO_RESPONSAVEL_LABEL: Record<string, string> = {
  pessoal: 'Pessoal',
  parente: 'Parente',
  terceiros: 'Terceiros',
}

const DDI_OPTIONS = [
  { label: '🇯🇵 +81', value: '+81' },
  { label: '🇧🇷 +55', value: '+55' },
  { label: '🇺🇸 +1', value: '+1' },
  { label: '🇵🇹 +351', value: '+351' },
  { label: '🇪🇸 +34', value: '+34' },
  { label: '🇮🇹 +39', value: '+39' },
  { label: '🇬🇧 +44', value: '+44' },
  { label: '🇵🇾 +595', value: '+595' },
]

type ProfileForm = Pick<ProfileInsert, 'full_name' | 'email' | 'phone' | 'whatsapp' | 'avatar_url' | 'is_active'>

type ClienteForm = Pick<
  ClienteInsert,
  | 'status_processo'
  | 'assigned_instrutor_id'
  | 'cpf'
  | 'data_nascimento'
  | 'nome_japones'
  | 'nacionalidade'
  | 'zairyu_card'
  | 'visto_tipo'
  | 'visto_validade'
  | 'data_entrada_japao'
  | 'profissao_tipo'
  | 'profissao_empresa'
  | 'cep_jp'
  | 'provincia_jp'
  | 'cidade_jp'
  | 'bairro_jp'
  | 'numero_bloco_jp'
  | 'apartamento_jp'
  | 'complemento_jp'
  | 'endereco_jp'
  | 'mapa_link_jp'
  | 'cnh_numero'
  | 'cnh_categoria'
  | 'cnh_validade'
  | 'cnh_estado_emissor'
  | 'observacoes'
>

type ContatoForm = Omit<ClienteContatoInsert, 'cliente_id'>
type HabilitacaoForm = Omit<ClienteHabilitacaoInsert, 'cliente_id'>
type EntradaSaidaForm = Omit<ClienteEntradaSaidaInsert, 'cliente_id'>

type EditableFieldProps = {
  label: string
  value: string | null | undefined
  editing: boolean
  onChange: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'url'
  multiline?: boolean
}

function normalizeFormValue(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function localUriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => resolve(xhr.response)
    xhr.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'))
    xhr.responseType = 'blob'
    xhr.open('GET', uri, true)
    xhr.send(null)
  })
}

function BooleanField({
  label,
  value,
  editing,
  onChange,
}: {
  label: string
  value: boolean
  editing: boolean
  onChange: (value: boolean) => void
}) {
  if (!editing) return <InfoRow label={label} value={value ? 'Sim' : 'Não'} />
  return (
    <View style={s.fieldBlock}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.segmented}>
        {[true, false].map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={[s.segmentOption, value === option && s.segmentOptionActive]}
            onPress={() => onChange(option)}
            activeOpacity={0.85}
          >
            <Text style={[s.segmentTxt, value === option && s.segmentTxtActive]}>
              {option ? 'Sim' : 'Não'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function EditableField({
  label,
  value,
  editing,
  onChange,
  placeholder,
  keyboardType = 'default',
  multiline,
}: EditableFieldProps) {
  if (editing) {
    return (
      <View style={s.fieldBlock}>
        <Text style={s.fieldLabel}>{label}</Text>
        <TextInput
          value={value ?? ''}
          onChangeText={onChange}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.ink300}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[s.fieldInput, multiline && s.fieldInputMulti]}
        />
      </View>
    )
  }

  return <InfoRow label={label} value={value ?? null} />
}

function InfoRow({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value ?? '—'}</Text>
    </View>
  )
}

function MiniTag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[s.miniTag, { backgroundColor: bg }]}>
      <Text style={[s.miniTagTxt, { color }]}>{label}</Text>
    </View>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={s.emptyStateTxt}>{text}</Text>
    </View>
  )
}

function SectionHeader({
  title,
  editing,
  onEdit,
  onCancel,
}: {
  title: string
  editing?: boolean
  onEdit?: () => void
  onCancel?: () => void
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={[s.sectionLabel, s.sectionLabelInline]}>{title}</Text>
      {onEdit && (
        <TouchableOpacity
          style={[s.sectionEditBtn, editing && s.sectionEditBtnActive]}
          onPress={editing ? onCancel : onEdit}
          activeOpacity={0.8}
        >
          <Ionicons
            name={editing ? 'close' : 'create-outline'}
            size={13}
            color={editing ? colors.err : colors.navy800}
          />
          <Text style={[s.sectionEditTxt, editing && { color: colors.err }]}>
            {editing ? 'Cancelar' : 'Editar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function ActionTile({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  color: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={s.actionTile} onPress={onPress} activeOpacity={0.82}>
      <View style={[s.actionTileIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.actionTileLabel}>{label}</Text>
        <Text style={s.actionTileValue} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.ink300} />
    </TouchableOpacity>
  )
}

function formatJpy(value: number): string {
  return `¥ ${value.toLocaleString('ja-JP')}`
}

export default function ClienteDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [editingSection, setEditingSection] = useState<
    'pessoal' | 'endereco' | 'contatos' | 'habilitacoes' | 'japao' | 'observacoes' | null
  >(null)
  const [editingItem, setEditingItem] = useState<{ section: 'contatos' | 'habilitacoes' | 'japao'; id: string } | null>(null)
  const [ddiPickerFor, setDdiPickerFor] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: null,
    whatsapp: null,
    avatar_url: null,
    is_active: true,
  })
  const [clienteForm, setClienteForm] = useState<ClienteForm>({
    status_processo: 'prospect',
    assigned_instrutor_id: null,
    cpf: null,
    data_nascimento: null,
    nome_japones: null,
    nacionalidade: null,
    zairyu_card: null,
    visto_tipo: null,
    visto_validade: null,
    data_entrada_japao: null,
    profissao_tipo: null,
    profissao_empresa: null,
    cep_jp: null,
    provincia_jp: null,
    cidade_jp: null,
    bairro_jp: null,
    numero_bloco_jp: null,
    apartamento_jp: null,
    complemento_jp: null,
    endereco_jp: null,
    mapa_link_jp: null,
    cnh_numero: null,
    cnh_categoria: null,
    cnh_validade: null,
    cnh_estado_emissor: null,
    observacoes: null,
  })
  const [contatoDrafts, setContatoDrafts] = useState<Record<string, ContatoForm>>({})
  const [habilitacaoDrafts, setHabilitacaoDrafts] = useState<Record<string, HabilitacaoForm>>({})
  const [entradaSaidaDrafts, setEntradaSaidaDrafts] = useState<Record<string, EntradaSaidaForm>>({})

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['admin-cliente', id],
    queryFn: () => getCliente(db, id),
    enabled: !!id,
  })

  const { data: processos } = useQuery({
    queryKey: ['admin-cliente-processos', id],
    queryFn: () => listProcessosByCliente(db, id),
    enabled: !!id,
  })

  const { data: contatos } = useQuery({
    queryKey: ['admin-cliente-contatos', id],
    queryFn: () => listContatosByCliente(db, id),
    enabled: !!id,
  })

  const { data: habilitacoes } = useQuery({
    queryKey: ['admin-cliente-habilitacoes', id],
    queryFn: () => listHabilitacoesByCliente(db, id),
    enabled: !!id,
  })

  const { data: entradasSaidas } = useQuery({
    queryKey: ['admin-cliente-entradas-saidas', id],
    queryFn: () => listEntradasSaidasByCliente(db, id),
    enabled: !!id,
  })

  const { data: pagamentos } = useQuery({
    queryKey: ['admin-cliente-pagamentos', id],
    queryFn: () => listPagamentos(db, { cliente_id: id }),
    enabled: !!id,
  })

  const { data: documentos } = useQuery({
    queryKey: ['admin-cliente-documentos', id],
    queryFn: () => getClienteDocumentos(db, id),
    enabled: !!id,
  })

  const { data: agendamentos } = useQuery({
    queryKey: ['admin-cliente-agendamentos', id],
    queryFn: () => listAgendamentos(db, { cliente_id: id }),
    enabled: !!id,
  })

  useEffect(() => {
    if (!cliente) return
    setProfileForm({
      full_name: cliente.profile?.full_name ?? '',
      email: cliente.profile?.email ?? '',
      phone: cliente.profile?.phone ?? null,
      whatsapp: cliente.profile?.whatsapp ?? null,
      avatar_url: cliente.profile?.avatar_url ?? null,
      is_active: cliente.profile?.is_active ?? true,
    })
    setClienteForm({
      status_processo: cliente.status_processo,
      assigned_instrutor_id: cliente.assigned_instrutor_id,
      cpf: cliente.cpf,
      data_nascimento: cliente.data_nascimento,
      nome_japones: cliente.nome_japones,
      nacionalidade: cliente.nacionalidade,
      zairyu_card: cliente.zairyu_card,
      visto_tipo: cliente.visto_tipo,
      visto_validade: cliente.visto_validade,
      data_entrada_japao: cliente.data_entrada_japao,
      profissao_tipo: cliente.profissao_tipo,
      profissao_empresa: cliente.profissao_empresa,
      cep_jp: cliente.cep_jp,
      provincia_jp: cliente.provincia_jp,
      cidade_jp: cliente.cidade_jp,
      bairro_jp: cliente.bairro_jp,
      numero_bloco_jp: cliente.numero_bloco_jp,
      apartamento_jp: cliente.apartamento_jp,
      complemento_jp: cliente.complemento_jp,
      endereco_jp: cliente.endereco_jp,
      mapa_link_jp: cliente.mapa_link_jp,
      cnh_numero: cliente.cnh_numero,
      cnh_categoria: cliente.cnh_categoria,
      cnh_validade: cliente.cnh_validade,
      cnh_estado_emissor: cliente.cnh_estado_emissor,
      observacoes: cliente.observacoes,
    })
  }, [cliente])

  useEffect(() => {
    setContatoDrafts(Object.fromEntries((contatos ?? []).map((c) => [c.id, {
      ddi: c.ddi,
      numero: c.numero,
      tipo_responsavel: c.tipo_responsavel,
      nome_responsavel: c.nome_responsavel,
      relacao: c.relacao,
      tem_whatsapp: c.tem_whatsapp,
      is_principal: c.is_principal,
    }])))
  }, [contatos])

  useEffect(() => {
    setHabilitacaoDrafts(Object.fromEntries((habilitacoes ?? []).map((h) => [h.id, {
      pais: h.pais,
      categoria: h.categoria,
      nome_habilitacao: h.nome_habilitacao,
      numero: h.numero,
      data_emissao: h.data_emissao,
      data_vencimento: h.data_vencimento,
      observacoes: h.observacoes,
      situacao: h.situacao,
    }])))
  }, [habilitacoes])

  useEffect(() => {
    setEntradaSaidaDrafts(Object.fromEntries((entradasSaidas ?? []).map((es) => [es.id, {
      data_viagem: es.data_viagem,
      tipo: es.tipo,
      observacao: es.observacao,
    }])))
  }, [entradasSaidas])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      await Promise.all([
        updateProfile(db, cliente.profile_id, {
          full_name: profileForm.full_name.trim(),
          email: profileForm.email.trim(),
          phone: normalizeFormValue(profileForm.phone ?? ''),
          whatsapp: normalizeFormValue(profileForm.whatsapp ?? ''),
          avatar_url: normalizeFormValue(profileForm.avatar_url ?? ''),
          is_active: profileForm.is_active,
        }),
        updateCliente(db, cliente.id, {
          ...clienteForm,
          status_processo: clienteForm.status_processo,
          assigned_instrutor_id: normalizeFormValue(clienteForm.assigned_instrutor_id ?? ''),
          cpf: normalizeFormValue(clienteForm.cpf ?? ''),
          data_nascimento: normalizeFormValue(clienteForm.data_nascimento ?? ''),
          nome_japones: normalizeFormValue(clienteForm.nome_japones ?? ''),
          nacionalidade: normalizeFormValue(clienteForm.nacionalidade ?? ''),
          zairyu_card: normalizeFormValue(clienteForm.zairyu_card ?? ''),
          visto_tipo: normalizeFormValue(clienteForm.visto_tipo ?? ''),
          visto_validade: normalizeFormValue(clienteForm.visto_validade ?? ''),
          data_entrada_japao: normalizeFormValue(clienteForm.data_entrada_japao ?? ''),
          profissao_tipo: normalizeFormValue(clienteForm.profissao_tipo ?? '') as ClienteInsert['profissao_tipo'],
          profissao_empresa: normalizeFormValue(clienteForm.profissao_empresa ?? ''),
          cep_jp: normalizeFormValue(clienteForm.cep_jp ?? ''),
          provincia_jp: normalizeFormValue(clienteForm.provincia_jp ?? ''),
          cidade_jp: normalizeFormValue(clienteForm.cidade_jp ?? ''),
          bairro_jp: normalizeFormValue(clienteForm.bairro_jp ?? ''),
          numero_bloco_jp: normalizeFormValue(clienteForm.numero_bloco_jp ?? ''),
          apartamento_jp: normalizeFormValue(clienteForm.apartamento_jp ?? ''),
          complemento_jp: normalizeFormValue(clienteForm.complemento_jp ?? ''),
          endereco_jp: normalizeFormValue(clienteForm.endereco_jp ?? ''),
          mapa_link_jp: normalizeFormValue(clienteForm.mapa_link_jp ?? ''),
          cnh_numero: normalizeFormValue(clienteForm.cnh_numero ?? ''),
          cnh_categoria: normalizeFormValue(clienteForm.cnh_categoria ?? ''),
          cnh_validade: normalizeFormValue(clienteForm.cnh_validade ?? ''),
          cnh_estado_emissor: normalizeFormValue(clienteForm.cnh_estado_emissor ?? ''),
          observacoes: normalizeFormValue(clienteForm.observacoes ?? ''),
        }),
      ])
    },
    onSuccess: () => {
      setEditingSection(null)
      queryClient.invalidateQueries({ queryKey: ['admin-cliente', id] })
      Alert.alert('Dados atualizados', 'O cadastro do cliente foi salvo.')
    },
    onError: () => {
      Alert.alert('Não foi possível salvar', 'Confira os dados e tente novamente.')
    },
  })

  const refreshEditableLists = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-cliente-contatos', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-cliente-habilitacoes', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-cliente-entradas-saidas', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-cliente-processos', id] })
  }

  const saveContatosMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      await Promise.all(Object.entries(contatoDrafts).map(([contatoId, draft]) => {
        const payload = {
          ddi: normalizeFormValue(draft.ddi) ?? '+81',
          numero: normalizeFormValue(draft.numero) ?? '',
          tipo_responsavel: (normalizeFormValue(draft.tipo_responsavel) ?? 'pessoal') as ClienteContatoInsert['tipo_responsavel'],
          nome_responsavel: normalizeFormValue(draft.nome_responsavel ?? ''),
          relacao: normalizeFormValue(draft.relacao ?? ''),
          tem_whatsapp: draft.tem_whatsapp,
          is_principal: draft.is_principal,
        }
        return contatoId.startsWith('novo-')
          ? createContato(db, { cliente_id: id, ...payload })
          : updateContato(db, id, contatoId, payload)
      }))
    },
    onSuccess: () => {
      setEditingSection(null)
      setEditingItem(null)
      refreshEditableLists()
    },
  })

  const saveHabilitacoesMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      await Promise.all(Object.entries(habilitacaoDrafts).map(([habilitacaoId, draft]) => {
        const payload = {
          pais: normalizeFormValue(draft.pais) ?? '',
          categoria: normalizeFormValue(draft.categoria ?? ''),
          nome_habilitacao: normalizeFormValue(draft.nome_habilitacao ?? ''),
          numero: normalizeFormValue(draft.numero ?? ''),
          data_emissao: normalizeFormValue(draft.data_emissao ?? ''),
          data_vencimento: normalizeFormValue(draft.data_vencimento ?? ''),
          observacoes: normalizeFormValue(draft.observacoes ?? ''),
          situacao: (normalizeFormValue(draft.situacao) ?? 'positiva') as ClienteHabilitacaoInsert['situacao'],
        }
        return habilitacaoId.startsWith('novo-')
          ? createHabilitacao(db, { cliente_id: id, ...payload })
          : updateHabilitacao(db, id, habilitacaoId, payload)
      }))
    },
    onSuccess: () => {
      setEditingSection(null)
      setEditingItem(null)
      refreshEditableLists()
    },
  })

  const saveEntradasSaidasMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      await Promise.all(Object.entries(entradaSaidaDrafts).map(([entradaSaidaId, draft]) => {
        const payload = {
          data_viagem: normalizeFormValue(draft.data_viagem) ?? new Date().toISOString().slice(0, 10),
          tipo: (normalizeFormValue(draft.tipo) ?? 'entrada') as ClienteEntradaSaidaInsert['tipo'],
          observacao: normalizeFormValue(draft.observacao ?? ''),
        }
        return entradaSaidaId.startsWith('novo-')
          ? createEntradaSaida(db, { cliente_id: id, ...payload })
          : updateEntradaSaida(db, id, entradaSaidaId, payload)
      }))
    },
    onSuccess: () => {
      setEditingSection(null)
      setEditingItem(null)
      refreshEditableLists()
    },
  })

  const processosAtivos = processos?.filter((p) => p.status === 'ativo').length ?? 0
  const processosConcluidos = processos?.filter((p) => p.status === 'concluido').length ?? 0

  const totalPago = pagamentos?.filter((p) => p.status === 'pago').reduce((acc, p) => acc + p.valor_jpy, 0) ?? 0
  const totalPendente = pagamentos?.filter((p) => p.status === 'pendente').reduce((acc, p) => acc + p.valor_jpy, 0) ?? 0
  const documentosPendentes = documentos?.filter((d) => d.status !== 'aprovado').length ?? 0
  const proximoAgendamento = agendamentos?.find((a) => new Date(a.data_hora_inicio).getTime() >= Date.now())
  const statusColor = cliente ? STATUS_COLOR[cliente.status_processo] : colors.navy800
  const statusLabel = cliente ? STATUS_LABEL[cliente.status_processo] : ''

  const completeness = useMemo(() => {
    if (!cliente) return { done: 0, total: 0, percent: 0, missing: [] as string[] }
    const checks = [
      ['Nome', cliente.profile?.full_name],
      ['E-mail', cliente.profile?.email],
      ['Telefone', cliente.profile?.phone],
      ['WhatsApp', cliente.profile?.whatsapp],
      ['CPF', cliente.cpf],
      ['Nascimento', cliente.data_nascimento],
      ['Nacionalidade', cliente.nacionalidade],
      ['Zairyu Card', cliente.zairyu_card],
      ['Tipo de visto', cliente.visto_tipo],
      ['Validade do visto', cliente.visto_validade],
      ['Profissão', cliente.profissao_tipo],
      ['CEP', cliente.cep_jp],
      ['Província', cliente.provincia_jp],
      ['Cidade', cliente.cidade_jp],
      ['Endereço', cliente.endereco_jp || cliente.numero_bloco_jp],
    ] as const
    const done = checks.filter(([, value]) => Boolean(value)).length
    const missing = checks.filter(([, value]) => !value).slice(0, 3).map(([label]) => label)
    return {
      done,
      total: checks.length,
      percent: Math.round((done / checks.length) * 100),
      missing,
    }
  }, [cliente])

  const handleLigar = () => {
    const phone = cliente?.profile?.phone
    if (phone) Linking.openURL(`tel:${phone}`)
  }

  const handlePickAvatar = async () => {
    if (!cliente) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria nas configurações.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
      quality: 0.75,
    })
    if (result.canceled || !result.assets[0]) return

    const previousAvatar = profileForm.avatar_url
    const asset = result.assets[0]
    const uri = asset.uri
    setProfileForm((current) => ({ ...current, avatar_url: uri }))

    try {
      setUploadingAvatar(true)
      const sourceName = asset.fileName ?? uri.split('/').pop() ?? 'avatar.jpg'
      const contentType = asset.mimeType ?? 'image/jpeg'
      const extFromMime = contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/png'
          ? 'png'
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
      setProfileForm((current) => ({ ...current, avatar_url: publicUrl }))
      queryClient.setQueryData(['admin-cliente', id], (current: any) => current
        ? { ...current, profile: { ...current.profile, avatar_url: publicUrl } }
        : current)
      queryClient.invalidateQueries({ queryKey: ['admin-cliente', id] })
    } catch (error) {
      console.error('Erro ao enviar avatar:', error)
      setProfileForm((current) => ({ ...current, avatar_url: previousAvatar }))
      Alert.alert('Não foi possível enviar a foto', 'Tente novamente com outra imagem.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const updateProfileField = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const updateClienteField = (field: keyof ClienteForm, value: string) => {
    setClienteForm((current) => ({ ...current, [field]: value }))
  }

  const addContatoDraft = () => {
    const key = `novo-${Date.now()}`
    setContatoDrafts((current) => ({
      ...current,
      [key]: {
        ddi: '+81',
        numero: '',
        tipo_responsavel: 'pessoal',
        nome_responsavel: null,
        relacao: null,
        tem_whatsapp: true,
        is_principal: Object.keys(current).length === 0,
      },
    }))
    setEditingItem({ section: 'contatos', id: key })
  }

  const addHabilitacaoDraft = () => {
    const key = `novo-${Date.now()}`
    setHabilitacaoDrafts((current) => ({
      ...current,
      [key]: {
        pais: '',
        categoria: null,
        nome_habilitacao: null,
        numero: null,
        data_emissao: null,
        data_vencimento: null,
        observacoes: null,
        situacao: 'positiva',
      },
    }))
    setEditingItem({ section: 'habilitacoes', id: key })
  }

  const addEntradaSaidaDraft = () => {
    const key = `novo-${Date.now()}`
    setEntradaSaidaDrafts((current) => ({
      ...current,
      [key]: {
        data_viagem: new Date().toISOString().slice(0, 10),
        tipo: 'entrada',
        observacao: null,
      },
    }))
    setEditingItem({ section: 'japao', id: key })
  }

  const isEditingItem = (section: 'contatos' | 'habilitacoes' | 'japao', key: string) =>
    editingItem?.section === section && editingItem.id === key

  const removeLocalDraft = <T,>(setter: Dispatch<SetStateAction<Record<string, T>>>, key: string) => {
    setter((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const activeNewContatoId = editingItem?.section === 'contatos' && editingItem.id.startsWith('novo-') ? editingItem.id : null
  const activeNewContato = activeNewContatoId ? contatoDrafts[activeNewContatoId] : null
  const activeNewHabilitacaoId = editingItem?.section === 'habilitacoes' && editingItem.id.startsWith('novo-') ? editingItem.id : null
  const activeNewHabilitacao = activeNewHabilitacaoId ? habilitacaoDrafts[activeNewHabilitacaoId] : null
  const activeNewEntradaId = editingItem?.section === 'japao' && editingItem.id.startsWith('novo-') ? editingItem.id : null
  const activeNewEntrada = activeNewEntradaId ? entradaSaidaDrafts[activeNewEntradaId] : null

  const renderDdiDropdown = (draftId: string) => (
    <View style={s.ddiDropdown}>
      {DDI_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={s.ddiOption}
          onPress={() => {
            setContatoDrafts((current) => {
              const draft = current[draftId]
              if (!draft) return current
              return {
                ...current,
                [draftId]: { ...draft, ddi: option.value },
              }
            })
            setDdiPickerFor(null)
          }}
          activeOpacity={0.85}
        >
          <Text style={s.ddiOptionTxt}>{option.label}</Text>
          {contatoDrafts[draftId]?.ddi === option.value && (
            <Ionicons name="checkmark" size={16} color={colors.navy800} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.navy800} />
        </View>
      ) : !cliente ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.ink500 }}>Cliente não encontrado</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Gradient header */}
          <View style={s.heroHeader}>
            <View style={s.heroCircle} />
            <View style={s.heroNav}>
              <TouchableOpacity style={s.heroBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={18} color="white" />
              </TouchableOpacity>
              <Text style={s.heroNavTitle}>Clientes</Text>
              <View style={s.heroBtnSpacer} />
            </View>

            <View style={s.heroProfile}>
              <Avatar name={cliente.profile?.full_name ?? 'Cliente'} size={64} url={cliente.profile?.avatar_url} />
              <View style={{ flex: 1 }}>
                <Text style={s.heroName}>{cliente.profile?.full_name ?? '—'}</Text>
                <Text style={s.heroEmail}>{cliente.profile?.email ?? '—'}</Text>
                <View style={s.heroChips}>
                  <View style={[s.chip, { backgroundColor: statusColor + '33' }]}>
                    <Text style={[s.chipTxt, { color: 'white' }]}>{statusLabel}</Text>
                  </View>
                  <View style={[s.chip, { backgroundColor: 'rgba(34,197,94,.25)' }]}>
                    <Text style={[s.chipTxt, { color: '#86EFAC' }]}>
                      {cliente.profile?.is_active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.heroActions}>
              <TouchableOpacity style={s.heroActionGlass} activeOpacity={0.8}>
                <Ionicons name="chatbubble-outline" size={14} color="white" />
                <Text style={s.heroActionTxt}>Mensagem</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.heroActionWhite} activeOpacity={0.8} onPress={handleLigar}>
                <Ionicons name="call-outline" size={13} color={colors.navy800} />
                <Text style={s.heroActionTxtDark}>Ligar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.content}>
            <View style={s.readinessCard}>
              <View style={s.readinessTop}>
                <View>
                  <Text style={s.readinessEyebrow}>Prontidão cadastral</Text>
                  <Text style={s.readinessTitle}>{completeness.percent}% completo</Text>
                </View>
                <View style={s.readinessBadge}>
                  <Text style={s.readinessBadgeTxt}>{completeness.done}/{completeness.total}</Text>
                </View>
              </View>
              <View style={s.readinessTrack}>
                <View style={[s.readinessFill, { width: `${completeness.percent}%` }]} />
              </View>
              <Text style={s.readinessHint}>
                {completeness.missing.length > 0
                  ? `Priorize: ${completeness.missing.join(', ')}`
                  : 'Cadastro pronto para contratação de serviços.'}
              </Text>
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { n: String(processosAtivos), l: 'Ativos', c: colors.navy800 },
                { n: String(processosConcluidos), l: 'Concluídos', c: colors.ok },
                { n: totalPago > 0 ? formatJpy(totalPago) : '—', l: 'Investido', c: '#0891B2' },
              ].map(({ n, l, c }) => (
                <View key={l} style={s.statCard}>
                  <Text style={[s.statN, { color: c }]}>{n}</Text>
                  <Text style={s.statL}>{l}</Text>
                </View>
              ))}
            </View>

            <SectionHeader title="Acessos do cliente" />
            <View style={s.actionGrid}>
              <ActionTile
                icon="layers-outline"
                label="Processo"
                value={processosAtivos > 0 ? `${processosAtivos} ativo(s)` : `${processos?.length ?? 0} registro(s)`}
                color={colors.navy800}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'processos' } } as any)}
              />
              <ActionTile
                icon="document-text-outline"
                label="Documentos"
                value={documentosPendentes > 0 ? `${documentosPendentes} pendente(s)` : `${documentos?.length ?? 0} anexado(s)`}
                color="#0891B2"
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'documentos' } } as any)}
              />
              <ActionTile
                icon="calendar-outline"
                label="Agendamentos"
                value={proximoAgendamento ? safeDate(proximoAgendamento.data_hora_inicio, "d/MM 'às' HH:mm") ?? 'Próximo agendamento' : `${agendamentos?.length ?? 0} registro(s)`}
                color="#7C3AED"
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'agendamentos' } } as any)}
              />
              <ActionTile
                icon="wallet-outline"
                label="Financeiro"
                value={totalPendente > 0 ? `${formatJpy(totalPendente)} pendente` : `${formatJpy(totalPago)} pago`}
                color={colors.ok}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'financeiro' } } as any)}
              />
            </View>

            {/* ── Dados pessoais ── */}
            <SectionHeader
              title="Dados pessoais"
              editing={editingSection === 'pessoal'}
              onEdit={() => setEditingSection('pessoal')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <View style={s.photoField}>
                <View style={s.photoAvatarWrap}>
                  <Avatar name={profileForm.full_name || 'Cliente'} size={76} url={profileForm.avatar_url} />
                  {editingSection === 'pessoal' && (
                    <TouchableOpacity style={s.photoCameraBtn} onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.85}>
                      {uploadingAvatar ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Ionicons name="camera" size={15} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.photoTitle}>Foto de Perfil</Text>
                  <Text style={s.photoHint}>
                    {editingSection === 'pessoal' ? 'Selecione uma imagem da galeria.' : 'Edite os dados pessoais para alterar a foto.'}
                  </Text>
                  {editingSection === 'pessoal' && (
                    <TouchableOpacity style={s.photoPickerBtn} onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.85}>
                      {uploadingAvatar ? <ActivityIndicator size="small" color={colors.navy800} /> : <Ionicons name="image-outline" size={15} color={colors.navy800} />}
                      <Text style={s.photoPickerTxt}>{uploadingAvatar ? 'Enviando foto...' : 'Escolher da galeria'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <EditableField label="Nome completo" value={profileForm.full_name} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('full_name', v)} />
              <EditableField label="Nome em Japonês (フリガナ)" value={clienteForm.nome_japones} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('nome_japones', v)} placeholder="Katakana ou Kanji" />
              <EditableField label="Data de Nascimento" value={editingSection === 'pessoal' ? clienteForm.data_nascimento : safeDate(cliente.data_nascimento, 'd/MM/yyyy')} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('data_nascimento', v)} placeholder="AAAA-MM-DD" />
              <EditableField label="Nacionalidade" value={clienteForm.nacionalidade} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('nacionalidade', v)} />
              <EditableField label="CPF" value={clienteForm.cpf} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('cpf', v)} keyboardType="number-pad" />
              <EditableField label="Email" value={profileForm.email} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('email', v)} keyboardType="email-address" />
              <EditableField label="Zairyu Card / Japanese ID" value={clienteForm.zairyu_card} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('zairyu_card', v)} placeholder="Número do cartão" />
              <EditableField label="Tipo de Visto" value={clienteForm.visto_tipo} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('visto_tipo', v)} placeholder="Ex: Cônjuge, Trabalho, Estudante..." />
              <EditableField
                label="Validade do Visto / Documento"
                value={editingSection === 'pessoal' ? clienteForm.visto_validade : safeDate(cliente.visto_validade, 'd/MM/yyyy')}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('visto_validade', v)}
                placeholder="AAAA-MM-DD"
              />
              <View style={s.formSubsection}>
                <Text style={s.formSubsectionTitle}>Profissão / Trabalho</Text>
              </View>
              <EditableField
                label="Tipo de Trabalho"
                value={editingSection === 'pessoal' ? clienteForm.profissao_tipo : cliente.profissao_tipo ? PROFISSAO_LABEL[cliente.profissao_tipo] ?? cliente.profissao_tipo : null}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('profissao_tipo', v)}
                placeholder="Selecionar"
              />
              <EditableField label="Empresa" value={clienteForm.profissao_empresa} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('profissao_empresa', v)} />
            </View>
            {editingSection === 'pessoal' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar dados pessoais</Text>
              </TouchableOpacity>
            )}

            {/* ── Contatos ── */}
            <SectionHeader title="Contatos" />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addContatoDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar contato</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(contatoDrafts).length > 0 ? (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(contatoDrafts).filter(([draftId]) => draftId !== activeNewContatoId).map(([draftId, draft]) => {
                  const editing = isEditingItem('contatos', draftId)
                  const tipoContato = TIPO_RESPONSAVEL_LABEL[draft.tipo_responsavel] ?? draft.tipo_responsavel
                  return (
                    <View key={draftId} style={editing ? s.contactFormCard : s.contactListCard}>
                      {!editing ? (
                        <>
                          <View style={s.contactListMain}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={s.contactTitleRow}>
                                <Text style={s.contactNumber} numberOfLines={1}>{draft.ddi} {draft.numero || 'Novo contato'}</Text>
                                {draft.is_principal && <MiniTag label="Principal" color={colors.white} bg={colors.navy800} />}
                                {draft.tem_whatsapp && <MiniTag label="WhatsApp" color="#166534" bg="#DCFCE7" />}
                              </View>
                              <Text style={s.contactMeta} numberOfLines={1}>
                                {tipoContato}
                                {draft.nome_responsavel ? ` — ${draft.nome_responsavel}` : ''}
                                {draft.relacao ? ` (${draft.relacao})` : ''}
                              </Text>
                            </View>
                            <View style={s.itemHeaderActions}>
                              <TouchableOpacity style={s.editMiniBtn} onPress={() => setEditingItem({ section: 'contatos', id: draftId })}>
                                <Ionicons name="create-outline" size={14} color={colors.navy800} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.deleteMiniBtn}
                                onPress={() => {
                                  if (draftId.startsWith('novo-')) removeLocalDraft(setContatoDrafts, draftId)
                                  else deleteContato(db, id, draftId).then(refreshEditableLists)
                                }}
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.err} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={s.contactFormHeader}>
                            <Text style={s.contactFormTitle}>{draftId.startsWith('novo-') ? 'Novo Contato' : 'Editar Contato'}</Text>
                            <TouchableOpacity
                              style={s.cancelMiniBtn}
                              onPress={() => {
                                if (draftId.startsWith('novo-')) removeLocalDraft(setContatoDrafts, draftId)
                                setEditingItem(null)
                              }}
                            >
                              <Ionicons name="close" size={15} color={colors.ink500} />
                            </TouchableOpacity>
                          </View>

                          <View style={s.contactFormBody}>
                            <Text style={s.contactFormLabel}>Número</Text>
                            <View style={s.contactNumberInputs}>
                              <TouchableOpacity style={s.contactDdiInput} onPress={() => setDdiPickerFor((current) => current === draftId ? null : draftId)} activeOpacity={0.85}>
                                <Text style={s.contactDdiTxt}>{DDI_OPTIONS.find((o) => o.value === draft.ddi)?.label ?? draft.ddi}</Text>
                                <Ionicons name={ddiPickerFor === draftId ? 'chevron-up' : 'chevron-down'} size={13} color={colors.ink500} />
                              </TouchableOpacity>
                              <TextInput
                                value={draft.numero}
                                onChangeText={(v: string) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, numero: v } }))}
                                placeholder="90 0000-0000"
                                placeholderTextColor={colors.ink300}
                                style={s.contactNumberInput}
                                keyboardType="phone-pad"
                              />
                            </View>
                            {ddiPickerFor === draftId && renderDdiDropdown(draftId)}

                            <Text style={s.contactFormLabel}>Responsável pelo número</Text>
                            <View style={s.contactTypeGroup}>
                              {(['pessoal', 'parente', 'terceiros'] as const).map((tipo) => (
                                <TouchableOpacity
                                  key={tipo}
                                  style={[s.contactTypeBtn, draft.tipo_responsavel === tipo && s.contactTypeBtnActive]}
                                  onPress={() => setContatoDrafts((current) => ({
                                    ...current,
                                    [draftId]: {
                                      ...draft,
                                      tipo_responsavel: tipo,
                                      nome_responsavel: tipo === 'pessoal' ? null : draft.nome_responsavel,
                                      relacao: tipo === 'pessoal' ? null : draft.relacao,
                                    },
                                  }))}
                                  activeOpacity={0.85}
                                >
                                  <Text style={[s.contactTypeTxt, draft.tipo_responsavel === tipo && s.contactTypeTxtActive]}>
                                    {TIPO_RESPONSAVEL_LABEL[tipo]}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {draft.tipo_responsavel !== 'pessoal' && (
                              <>
                                <EditableField label="Nome do responsável" value={draft.nome_responsavel} editing onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, nome_responsavel: v } }))} />
                                <EditableField label="Relação" value={draft.relacao} editing onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, relacao: v } }))} placeholder="Ex: Esposa, Filho, Amigo..." />
                              </>
                            )}

                            <View style={s.contactCheckboxRow}>
                              <TouchableOpacity
                                style={s.contactCheckboxItem}
                                onPress={() => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, tem_whatsapp: !draft.tem_whatsapp } }))}
                                activeOpacity={0.85}
                              >
                                <View style={[s.contactCheckbox, draft.tem_whatsapp && s.contactCheckboxActive]}>
                                  {draft.tem_whatsapp && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                </View>
                                <Text style={s.contactCheckboxTxt}>Tem WhatsApp</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.contactCheckboxItem}
                                onPress={() => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, is_principal: !draft.is_principal } }))}
                                activeOpacity={0.85}
                              >
                                <View style={[s.contactCheckbox, draft.is_principal && s.contactCheckboxActive]}>
                                  {draft.is_principal && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                </View>
                                <Text style={s.contactCheckboxTxt}>Principal para contato</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={s.contactFooter}>
                              <TouchableOpacity
                                style={s.contactCancelBtn}
                                onPress={() => {
                                  if (draftId.startsWith('novo-')) removeLocalDraft(setContatoDrafts, draftId)
                                  setEditingItem(null)
                                }}
                                activeOpacity={0.85}
                              >
                                <Text style={s.contactCancelTxt}>Cancelar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={s.contactSaveBtn} onPress={() => saveContatosMutation.mutate()} disabled={saveContatosMutation.isPending} activeOpacity={0.85}>
                                {saveContatosMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={s.contactSaveTxt}>Salvar</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              <View style={s.infoCard}><EmptyState text="Nenhum contato cadastrado" /></View>
            )}

            {/* ── Endereço JP ── */}
            <SectionHeader
              title="Endereço"
              editing={editingSection === 'endereco'}
              onEdit={() => setEditingSection('endereco')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <EditableField label="CEP" value={clienteForm.cep_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('cep_jp', v)} keyboardType="number-pad" />
              <EditableField label="Província" value={clienteForm.provincia_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('provincia_jp', v)} />
              <EditableField label="Cidade" value={clienteForm.cidade_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('cidade_jp', v)} />
              <EditableField label="Bairro" value={clienteForm.bairro_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('bairro_jp', v)} />
              <EditableField label="Endereço completo em japonês" value={clienteForm.endereco_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('endereco_jp', v)} multiline />
              <EditableField label="Número / Bloco" value={clienteForm.numero_bloco_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('numero_bloco_jp', v)} />
              <EditableField label="Apartamento" value={clienteForm.apartamento_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('apartamento_jp', v)} />
              <EditableField label="Complemento" value={clienteForm.complemento_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('complemento_jp', v)} />
              <EditableField label="Link do mapa" value={clienteForm.mapa_link_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('mapa_link_jp', v)} keyboardType="url" />
              {cliente.mapa_link_jp && editingSection !== 'endereco' && (
                <TouchableOpacity
                  style={[s.infoRow, s.mapRow]}
                  onPress={() => Linking.openURL(cliente.mapa_link_jp!)}
                  activeOpacity={0.7}
                >
                  <Text style={s.infoLabel}>Localização</Text>
                  <View style={s.mapLink}>
                    <Text style={s.mapLinkTxt}>Abrir no Maps</Text>
                    <Ionicons name="open-outline" size={12} color={colors.navy800} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            {editingSection === 'endereco' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar endereço</Text>
              </TouchableOpacity>
            )}

            {/* ── Habilitações ── */}
            <SectionHeader title="Habilitações" />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addHabilitacaoDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar habilitação</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(habilitacaoDrafts).length > 0 ? (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(habilitacaoDrafts).filter(([draftId]) => draftId !== activeNewHabilitacaoId).map(([draftId, draft]) => {
                  const editing = isEditingItem('habilitacoes', draftId)
                  return (
                    <View key={draftId} style={s.editItemCard}>
                      <View style={s.editItemHeader}>
                        <Text style={s.editItemTitle}>{draft.pais || 'Nova habilitação'}{draft.categoria ? ` · Cat. ${draft.categoria}` : ''}</Text>
                        <View style={s.itemHeaderActions}>
                          {editing ? (
                            <>
                              <TouchableOpacity style={s.cancelMiniBtn} onPress={() => setEditingItem(null)}>
                                <Ionicons name="close" size={14} color={colors.ink500} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.deleteMiniBtn}
                                onPress={() => {
                                  if (draftId.startsWith('novo-')) removeLocalDraft(setHabilitacaoDrafts, draftId)
                                  else deleteHabilitacao(db, id, draftId).then(refreshEditableLists)
                                }}
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.err} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity style={s.editMiniBtn} onPress={() => setEditingItem({ section: 'habilitacoes', id: draftId })}>
                              <Ionicons name="create-outline" size={14} color={colors.navy800} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <EditableField label="País" value={draft.pais} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, pais: v } }))} />
                      <EditableField label="Nome" value={draft.nome_habilitacao} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, nome_habilitacao: v } }))} />
                      <EditableField label="Categoria" value={draft.categoria} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, categoria: v } }))} />
                      <EditableField label="Número" value={draft.numero} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, numero: v } }))} />
                      <EditableField label="Emissão" value={editing ? draft.data_emissao : safeDate(draft.data_emissao, 'd/MM/yyyy')} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, data_emissao: v } }))} placeholder="AAAA-MM-DD" />
                      <EditableField label="Validade" value={editing ? draft.data_vencimento : safeDate(draft.data_vencimento, 'd/MM/yyyy')} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, data_vencimento: v } }))} placeholder="AAAA-MM-DD" />
                      <EditableField label="Situação" value={draft.situacao} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, situacao: v as ClienteHabilitacaoInsert['situacao'] } }))} placeholder="positiva ou negativa" />
                      <EditableField label="Observações" value={draft.observacoes} editing={editing} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, observacoes: v } }))} multiline />
                      {editing && (
                        <TouchableOpacity style={s.saveItemBtn} onPress={() => saveHabilitacoesMutation.mutate()} disabled={saveHabilitacoesMutation.isPending} activeOpacity={0.85}>
                          {saveHabilitacoesMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={15} color={colors.white} />}
                          <Text style={s.saveItemTxt}>Salvar habilitação</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}
              </View>
            ) : (
              <View style={s.infoCard}><EmptyState text="Nenhuma habilitação cadastrada" /></View>
            )}

            {/* ── Japão / Visto ── */}
            <SectionHeader title="Japão/Visto" />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addEntradaSaidaDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar viagem</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(entradaSaidaDrafts).length > 0 && (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(entradaSaidaDrafts).filter(([draftId]) => draftId !== activeNewEntradaId).map(([draftId, draft]) => {
                  const editing = isEditingItem('japao', draftId)
                  return (
                    <View key={draftId} style={s.editItemCard}>
                      <View style={s.editItemHeader}>
                        <Text style={s.editItemTitle}>{draft.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {draft.data_viagem}</Text>
                        <View style={s.itemHeaderActions}>
                          {editing ? (
                            <>
                              <TouchableOpacity style={s.cancelMiniBtn} onPress={() => setEditingItem(null)}>
                                <Ionicons name="close" size={14} color={colors.ink500} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={s.deleteMiniBtn}
                                onPress={() => {
                                  if (draftId.startsWith('novo-')) removeLocalDraft(setEntradaSaidaDrafts, draftId)
                                  else deleteEntradaSaida(db, id, draftId).then(refreshEditableLists)
                                }}
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.err} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity style={s.editMiniBtn} onPress={() => setEditingItem({ section: 'japao', id: draftId })}>
                              <Ionicons name="create-outline" size={14} color={colors.navy800} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <EditableField label="Tipo" value={draft.tipo} editing={editing} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, tipo: v as ClienteEntradaSaidaInsert['tipo'] } }))} placeholder="entrada ou saida" />
                      <EditableField label="Data" value={editing ? draft.data_viagem : safeDate(draft.data_viagem, 'd/MM/yyyy')} editing={editing} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, data_viagem: v } }))} placeholder="AAAA-MM-DD" />
                      <EditableField label="Observação" value={draft.observacao} editing={editing} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, observacao: v } }))} multiline />
                      {editing && (
                        <TouchableOpacity style={s.saveItemBtn} onPress={() => saveEntradasSaidasMutation.mutate()} disabled={saveEntradasSaidasMutation.isPending} activeOpacity={0.85}>
                          {saveEntradasSaidasMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={15} color={colors.white} />}
                          <Text style={s.saveItemTxt}>Salvar viagem</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}
              </View>
            )}

            <SectionHeader
              title="Notas internas"
              editing={editingSection === 'observacoes'}
              onEdit={() => setEditingSection('observacoes')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <EditableField
                label="Observações"
                value={clienteForm.observacoes}
                editing={editingSection === 'observacoes'}
                onChange={(v) => updateClienteField('observacoes', v)}
                multiline
                placeholder="Preferências, restrições, documentos pendentes, contexto familiar..."
              />
            </View>
            {editingSection === 'observacoes' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar notas</Text>
              </TouchableOpacity>
            )}

            {/* ── Histórico ── */}
            <SectionHeader title="Histórico" />
            <View style={{ gap: 10, marginBottom: 8 }}>
              {processos && processos.length > 0 ? (
                processos.map((p, i) => {
                  const dt = p.created_at
                    ? safeDate(p.created_at, "d/MMM", ptBR)
                    : '—'
                  const histColors = [colors.navy800, colors.ok, '#0891B2', colors.ink400]
                  return (
                    <View key={p.id} style={s.histRow}>
                      <View style={[s.histDot, { backgroundColor: histColors[i % histColors.length] }]} />
                      <Text style={s.histTxt} numberOfLines={1}>{p.servico?.nome ?? 'Processo'}</Text>
                      <Text style={s.histDate}>{dt}</Text>
                    </View>
                  )
                })
              ) : (
                <View style={s.histRow}>
                  <View style={[s.histDot, { backgroundColor: colors.ink300 }]} />
                  <Text style={s.histTxt}>Cadastro criado</Text>
                  <Text style={s.histDate}>
                    {cliente.created_at
                      ? safeDate(cliente.created_at, "d/MMM", ptBR)
                      : '—'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={!!activeNewContatoId && !!activeNewContato}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (activeNewContatoId) removeLocalDraft(setContatoDrafts, activeNewContatoId)
            setEditingItem(null)
          }}
        >
          <View style={s.contactModalOverlay}>
            <TouchableOpacity style={s.keyboardDismissLayer} activeOpacity={1} onPress={Keyboard.dismiss} />
            <KeyboardAvoidingView
              style={s.contactModalKeyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
            >
              <View style={s.contactModalSheet}>
                {activeNewContatoId && activeNewContato && (
                  <>
                    <View style={s.contactModalHeader}>
                      <Text style={s.contactModalTitle}>Novo Contato</Text>
                      <TouchableOpacity
                        style={s.contactModalClose}
                        onPress={() => {
                          removeLocalDraft(setContatoDrafts, activeNewContatoId)
                          setEditingItem(null)
                        }}
                      >
                        <Ionicons name="close" size={15} color={colors.ink500} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      style={s.contactModalScroll}
                      contentContainerStyle={s.contactModalContent}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={s.contactFormLabel}>Número</Text>
                      <View style={s.contactNumberInputs}>
                        <TouchableOpacity style={s.contactDdiInput} onPress={() => setDdiPickerFor((current) => current === activeNewContatoId ? null : activeNewContatoId)} activeOpacity={0.85}>
                          <Text style={s.contactDdiTxt}>{DDI_OPTIONS.find((o) => o.value === activeNewContato.ddi)?.label ?? activeNewContato.ddi}</Text>
                          <Ionicons name={ddiPickerFor === activeNewContatoId ? 'chevron-up' : 'chevron-down'} size={13} color={colors.ink500} />
                        </TouchableOpacity>
                        <TextInput
                          value={activeNewContato.numero}
                          onChangeText={(v: string) => setContatoDrafts((current) => ({ ...current, [activeNewContatoId]: { ...activeNewContato, numero: v } }))}
                          placeholder="90 0000-0000"
                          placeholderTextColor={colors.ink300}
                          style={s.contactNumberInput}
                          keyboardType="phone-pad"
                          returnKeyType="done"
                        />
                      </View>
                      {ddiPickerFor === activeNewContatoId && renderDdiDropdown(activeNewContatoId)}

                      <Text style={s.contactFormLabel}>Responsável pelo número</Text>
                      <View style={s.contactTypeGroup}>
                        {(['pessoal', 'parente', 'terceiros'] as const).map((tipo) => (
                        <TouchableOpacity
                          key={tipo}
                          style={[s.contactTypeBtn, activeNewContato.tipo_responsavel === tipo && s.contactTypeBtnActive]}
                          onPress={() => setContatoDrafts((current) => ({
                            ...current,
                            [activeNewContatoId]: {
                              ...activeNewContato,
                              tipo_responsavel: tipo,
                              nome_responsavel: tipo === 'pessoal' ? null : activeNewContato.nome_responsavel,
                              relacao: tipo === 'pessoal' ? null : activeNewContato.relacao,
                            },
                          }))}
                          activeOpacity={0.85}
                        >
                          <Text style={[s.contactTypeTxt, activeNewContato.tipo_responsavel === tipo && s.contactTypeTxtActive]}>
                            {TIPO_RESPONSAVEL_LABEL[tipo]}
                          </Text>
                        </TouchableOpacity>
                        ))}
                      </View>

                      {activeNewContato.tipo_responsavel !== 'pessoal' && (
                        <>
                          <EditableField label="Nome do responsável" value={activeNewContato.nome_responsavel} editing onChange={(v) => setContatoDrafts((current) => ({ ...current, [activeNewContatoId]: { ...activeNewContato, nome_responsavel: v } }))} />
                          <EditableField label="Relação" value={activeNewContato.relacao} editing onChange={(v) => setContatoDrafts((current) => ({ ...current, [activeNewContatoId]: { ...activeNewContato, relacao: v } }))} placeholder="Ex: Esposa, Filho, Amigo..." />
                        </>
                      )}

                      <View style={s.contactCheckboxRow}>
                        <TouchableOpacity
                          style={s.contactCheckboxItem}
                          onPress={() => setContatoDrafts((current) => ({ ...current, [activeNewContatoId]: { ...activeNewContato, tem_whatsapp: !activeNewContato.tem_whatsapp } }))}
                          activeOpacity={0.85}
                        >
                          <View style={[s.contactCheckbox, activeNewContato.tem_whatsapp && s.contactCheckboxActive]}>
                            {activeNewContato.tem_whatsapp && <Ionicons name="checkmark" size={12} color={colors.white} />}
                          </View>
                          <Text style={s.contactCheckboxTxt}>Tem WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.contactCheckboxItem}
                          onPress={() => setContatoDrafts((current) => ({ ...current, [activeNewContatoId]: { ...activeNewContato, is_principal: !activeNewContato.is_principal } }))}
                          activeOpacity={0.85}
                        >
                          <View style={[s.contactCheckbox, activeNewContato.is_principal && s.contactCheckboxActive]}>
                            {activeNewContato.is_principal && <Ionicons name="checkmark" size={12} color={colors.white} />}
                          </View>
                          <Text style={s.contactCheckboxTxt}>Principal para contato</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>

                    <View style={s.contactModalFooter}>
                      <TouchableOpacity
                        style={[s.contactCancelBtn, s.contactModalAction]}
                        onPress={() => {
                          removeLocalDraft(setContatoDrafts, activeNewContatoId)
                          setEditingItem(null)
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={s.contactCancelTxt}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.contactSaveBtn, s.contactModalAction]} onPress={() => saveContatosMutation.mutate()} disabled={saveContatosMutation.isPending} activeOpacity={0.85}>
                        {saveContatosMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={s.contactSaveTxt}>Salvar</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={!!activeNewHabilitacaoId && !!activeNewHabilitacao}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (activeNewHabilitacaoId) removeLocalDraft(setHabilitacaoDrafts, activeNewHabilitacaoId)
            setEditingItem(null)
          }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              {activeNewHabilitacaoId && activeNewHabilitacao && (
                <>
                  <View style={s.contactFormHeader}>
                    <Text style={s.contactFormTitle}>Nova Habilitação</Text>
                    <TouchableOpacity
                      style={s.cancelMiniBtn}
                      onPress={() => {
                        removeLocalDraft(setHabilitacaoDrafts, activeNewHabilitacaoId)
                        setEditingItem(null)
                      }}
                    >
                      <Ionicons name="close" size={15} color={colors.ink500} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={s.modalBodyScroll} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                    <EditableField label="País" value={activeNewHabilitacao.pais} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, pais: v } }))} />
                    <EditableField label="Nome" value={activeNewHabilitacao.nome_habilitacao} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, nome_habilitacao: v } }))} />
                    <EditableField label="Categoria" value={activeNewHabilitacao.categoria} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, categoria: v } }))} />
                    <EditableField label="Número" value={activeNewHabilitacao.numero} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, numero: v } }))} />
                    <EditableField label="Emissão" value={activeNewHabilitacao.data_emissao} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, data_emissao: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Validade" value={activeNewHabilitacao.data_vencimento} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, data_vencimento: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Situação" value={activeNewHabilitacao.situacao} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, situacao: v as ClienteHabilitacaoInsert['situacao'] } }))} placeholder="positiva ou negativa" />
                    <EditableField label="Observações" value={activeNewHabilitacao.observacoes} editing onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [activeNewHabilitacaoId]: { ...activeNewHabilitacao, observacoes: v } }))} multiline />
                  </ScrollView>
                  <View style={s.contactFooter}>
                    <TouchableOpacity style={s.contactCancelBtn} onPress={() => { removeLocalDraft(setHabilitacaoDrafts, activeNewHabilitacaoId); setEditingItem(null) }} activeOpacity={0.85}>
                      <Text style={s.contactCancelTxt}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.contactSaveBtn} onPress={() => saveHabilitacoesMutation.mutate()} disabled={saveHabilitacoesMutation.isPending} activeOpacity={0.85}>
                      {saveHabilitacoesMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={s.contactSaveTxt}>Salvar</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={!!activeNewEntradaId && !!activeNewEntrada}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (activeNewEntradaId) removeLocalDraft(setEntradaSaidaDrafts, activeNewEntradaId)
            setEditingItem(null)
          }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              {activeNewEntradaId && activeNewEntrada && (
                <>
                  <View style={s.contactFormHeader}>
                    <Text style={s.contactFormTitle}>Nova Viagem</Text>
                    <TouchableOpacity
                      style={s.cancelMiniBtn}
                      onPress={() => {
                        removeLocalDraft(setEntradaSaidaDrafts, activeNewEntradaId)
                        setEditingItem(null)
                      }}
                    >
                      <Ionicons name="close" size={15} color={colors.ink500} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.contactFormBody}>
                    <EditableField label="Tipo" value={activeNewEntrada.tipo} editing onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [activeNewEntradaId]: { ...activeNewEntrada, tipo: v as ClienteEntradaSaidaInsert['tipo'] } }))} placeholder="entrada ou saida" />
                    <EditableField label="Data" value={activeNewEntrada.data_viagem} editing onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [activeNewEntradaId]: { ...activeNewEntrada, data_viagem: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Observação" value={activeNewEntrada.observacao} editing onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [activeNewEntradaId]: { ...activeNewEntrada, observacao: v } }))} multiline />
                    <View style={s.contactFooter}>
                      <TouchableOpacity style={s.contactCancelBtn} onPress={() => { removeLocalDraft(setEntradaSaidaDrafts, activeNewEntradaId); setEditingItem(null) }} activeOpacity={0.85}>
                        <Text style={s.contactCancelTxt}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.contactSaveBtn} onPress={() => saveEntradasSaidasMutation.mutate()} disabled={saveEntradasSaidasMutation.isPending} activeOpacity={0.85}>
                        {saveEntradasSaidasMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={s.contactSaveTxt}>Salvar</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },

  heroHeader: {
    backgroundColor: colors.navy800,
    padding: 20,
    paddingTop: 52,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCircle: {
    position: 'absolute', right: -60, top: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20,
  },
  heroBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnSpacer: { width: 36, height: 36 },
  heroNavTitle: { flex: 1, fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },

  heroProfile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroName: { fontSize: 19, fontWeight: '700', color: 'white', letterSpacing: -0.4 },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroChips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  chipTxt: { fontSize: 10.5, fontWeight: '600' },

  heroActions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  heroActionGlass: {
    flex: 1, paddingVertical: 11, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  heroActionWhite: {
    flex: 1, paddingVertical: 11, borderRadius: 11,
    backgroundColor: 'white',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  heroActionTxt: { fontSize: 12.5, fontWeight: '600', color: 'white' },
  heroActionTxtDark: { fontSize: 12.5, fontWeight: '700', color: colors.navy800 },

  content: { padding: 20 },

  readinessCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 14,
    marginBottom: 12,
  },
  readinessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  readinessEyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.6 },
  readinessTitle: { fontSize: 18, fontWeight: '800', color: colors.ink900, marginTop: 2 },
  readinessBadge: { backgroundColor: colors.navy50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  readinessBadgeTxt: { fontSize: 12, fontWeight: '800', color: colors.navy800 },
  readinessTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.ink100,
    overflow: 'hidden',
    marginTop: 13,
  },
  readinessFill: { height: '100%', borderRadius: 999, backgroundColor: colors.navy800 },
  readinessHint: { fontSize: 11.5, color: colors.ink500, marginTop: 9, lineHeight: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 13, padding: 11,
    alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.ink100,
  },
  statN: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  statL: { fontSize: 10, color: colors.ink500, marginTop: 1 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  sectionLabelInline: { marginBottom: 0, flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sectionEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.navy50,
  },
  sectionEditBtnActive: { backgroundColor: '#FEF2F2' },
  sectionEditTxt: { fontSize: 11, fontWeight: '700', color: colors.navy800 },

  actionGrid: { gap: 9, marginBottom: 22 },
  actionTile: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  actionTileIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionTileLabel: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  actionTileValue: { fontSize: 11.5, color: colors.ink500, marginTop: 2 },

  fieldBlock: {
    padding: 12,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
    gap: 7,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.4 },
  photoField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  photoAvatarWrap: { position: 'relative' },
  photoCameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink900 },
  photoHint: { fontSize: 11.5, color: colors.ink500, marginTop: 2, marginBottom: 8 },
  photoPickerBtn: {
    minHeight: 38,
    alignSelf: 'flex-start',
    borderRadius: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.navy50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  photoPickerTxt: { fontSize: 12, fontWeight: '800', color: colors.navy800 },
  formSubsection: {
    paddingHorizontal: 13,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.ink50,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  formSubsectionTitle: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  fieldInput: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink900,
  },
  fieldInputMulti: { minHeight: 96, paddingTop: 11, lineHeight: 18 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.ink50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 3,
    gap: 3,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 9,
  },
  segmentOptionActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.navy100 },
  segmentTxt: { fontSize: 12, fontWeight: '700', color: colors.ink500 },
  segmentTxtActive: { color: colors.navy800 },

  inlineActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -4, marginBottom: 10 },
  lightActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.navy50,
  },
  lightActionTxt: { fontSize: 11.5, fontWeight: '800', color: colors.navy800 },

  contactListCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 13,
  },
  contactListMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  contactNumber: { fontSize: 14, fontWeight: '800', color: colors.ink900 },
  contactMeta: { fontSize: 12, color: colors.ink500, marginTop: 5 },
  contactFormCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
  },
  contactFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  contactFormTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.ink900, letterSpacing: -0.3 },
  contactFormBody: { padding: 16, gap: 13 },
  contactFormLabel: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  contactNumberInputs: { flexDirection: 'row', gap: 10 },
  contactDdiInput: {
    width: 96,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.navy600,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  contactDdiTxt: { fontSize: 13, fontWeight: '800', color: colors.ink900 },
  contactNumberInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink900,
  },
  contactTypeGroup: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
  },
  contactTypeBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  contactTypeBtnActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.navy100 },
  contactTypeTxt: { fontSize: 11.5, fontWeight: '800', color: colors.ink500 },
  contactTypeTxtActive: { color: colors.navy800 },
  contactCheckboxRow: { gap: 10, marginTop: 2 },
  contactCheckboxItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  contactCheckboxActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  contactCheckboxTxt: { fontSize: 13, fontWeight: '700', color: colors.ink900 },
  contactFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  contactCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCancelTxt: { fontSize: 13, fontWeight: '800', color: colors.ink700 },
  contactSaveBtn: {
    minWidth: 92,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.navy800,
  },
  contactSaveTxt: { fontSize: 13, fontWeight: '800', color: colors.white },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  contactModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 34 : 24,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  keyboardDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardView: { width: '100%', maxHeight: '100%' },
  contactModalKeyboardView: {
    width: '100%',
    maxHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  contactModalSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '94%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  contactModalHeader: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactModalTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: colors.ink900, letterSpacing: -0.2 },
  contactModalClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink50,
  },
  contactModalScroll: { flexShrink: 1, flexGrow: 0 },
  contactModalContent: { padding: 18, gap: 14, paddingBottom: 20 },
  contactModalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 18 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    backgroundColor: colors.white,
  },
  contactModalAction: { flex: 1, minHeight: 54, borderRadius: 15 },
  modalBodyScroll: { maxHeight: 440, padding: 16 },
  ddiDropdown: {
    marginTop: -6,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  ddiOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ddiOptionTxt: { fontSize: 14, fontWeight: '800', color: colors.ink900 },

  editItemCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
  },
  editItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 13,
    backgroundColor: colors.ink50,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  editItemTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.ink900 },
  itemHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy50,
  },
  cancelMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink100,
  },
  deleteMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  saveItemBtn: {
    margin: 12,
    borderRadius: 11,
    paddingVertical: 12,
    backgroundColor: colors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  saveItemTxt: { fontSize: 12.5, fontWeight: '800', color: colors.white },

  saveBtn: {
    marginTop: -12,
    marginBottom: 22,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: colors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnTxt: { fontSize: 13, fontWeight: '800', color: colors.white },

  infoCard: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.ink100,
    overflow: 'hidden', marginBottom: 22,
  },
  infoRow: { flexDirection: 'row', padding: 11, paddingHorizontal: 13, alignItems: 'center' },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  infoLabel: { flex: 1, fontSize: 12.5, color: colors.ink500 },
  infoValue: { fontSize: 12.5, fontWeight: '600', color: colors.ink900 },

  mapRow: { alignItems: 'center' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLinkTxt: { fontSize: 12.5, fontWeight: '600', color: colors.navy800 },

  miniTag: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  miniTagTxt: { fontSize: 10, fontWeight: '700' },

  emptyState: { padding: 16, alignItems: 'center' },
  emptyStateTxt: { fontSize: 12.5, color: colors.ink400, fontStyle: 'italic' },

  // Histórico
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  histDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  histTxt: { flex: 1, fontSize: 12.5, fontWeight: '500', color: colors.ink900 },
  histDate: { fontSize: 11, color: colors.ink500 },
})
