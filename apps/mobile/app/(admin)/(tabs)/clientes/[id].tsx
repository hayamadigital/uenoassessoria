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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { db } from '@/lib/firebase'
import { getCliente, updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { createProcesso, deleteProcesso, listProcessosByCliente, updateProcesso } from '@ueno/firebase/queries/processos'
import { createContato, deleteContato, listContatosByCliente, updateContato } from '@ueno/firebase/queries/contatos'
import { createHabilitacao, deleteHabilitacao, listHabilitacoesByCliente, updateHabilitacao } from '@ueno/firebase/queries/habilitacoes'
import { createEntradaSaida, deleteEntradaSaida, listEntradasSaidasByCliente, updateEntradaSaida } from '@ueno/firebase/queries/entradas_saidas'
import { listPagamentos } from '@ueno/firebase/queries/financeiro'
import { getClienteDocumentos } from '@ueno/firebase/queries/documentos'
import { listAgendamentos } from '@ueno/firebase/queries/agendamentos'
import { listContratos } from '@ueno/firebase/queries/contratos'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  ClienteContatoInsert,
  ClienteEntradaSaidaInsert,
  ClienteHabilitacaoInsert,
  ClienteInsert,
  ClienteProcessoInsert,
  ProfileInsert,
  StatusClienteProcesso,
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

type ProfileForm = Pick<ProfileInsert, 'full_name' | 'email' | 'phone' | 'whatsapp' | 'is_active'>

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
type ProcessoForm = Omit<ClienteProcessoInsert, 'cliente_id'>

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

function numberOrNull(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const normalized = normalizeFormValue(value ?? '')
  if (!normalized) return null
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
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
    'pessoal' | 'endereco' | 'cnh' | 'contatos' | 'habilitacoes' | 'japao' | 'processos' | 'observacoes' | null
  >(null)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: null,
    whatsapp: null,
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
  const [processoDrafts, setProcessoDrafts] = useState<Record<string, ProcessoForm>>({})

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

  const { data: contratos } = useQuery({
    queryKey: ['admin-cliente-contratos', id],
    queryFn: () => listContratos(db, id),
    enabled: !!id,
  })

  useEffect(() => {
    if (!cliente) return
    setProfileForm({
      full_name: cliente.profile?.full_name ?? '',
      email: cliente.profile?.email ?? '',
      phone: cliente.profile?.phone ?? null,
      whatsapp: cliente.profile?.whatsapp ?? null,
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

  useEffect(() => {
    setProcessoDrafts(Object.fromEntries((processos ?? []).map((p) => [p.id, {
      servico_id: p.servico_id,
      data_inicio: p.data_inicio,
      valor_acordado_jpy: p.valor_acordado_jpy,
      status: p.status,
      notas: p.notas,
    }])))
  }, [processos])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) return
      await Promise.all([
        updateProfile(db, cliente.profile_id, {
          full_name: profileForm.full_name.trim(),
          email: profileForm.email.trim(),
          phone: normalizeFormValue(profileForm.phone ?? ''),
          whatsapp: normalizeFormValue(profileForm.whatsapp ?? ''),
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
      refreshEditableLists()
    },
  })

  const saveProcessosMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      await Promise.all(Object.entries(processoDrafts).map(([processoId, draft]) => {
        const payload = {
          servico_id: normalizeFormValue(draft.servico_id) ?? '',
          data_inicio: normalizeFormValue(draft.data_inicio ?? ''),
          valor_acordado_jpy: numberOrNull(draft.valor_acordado_jpy),
          status: (normalizeFormValue(draft.status) ?? 'ativo') as StatusClienteProcesso,
          notas: normalizeFormValue(draft.notas ?? ''),
        }
        return processoId.startsWith('novo-')
          ? createProcesso(db, { cliente_id: id, ...payload })
          : updateProcesso(db, processoId, payload)
      }))
    },
    onSuccess: () => {
      setEditingSection(null)
      refreshEditableLists()
    },
  })

  const processosAtivos = processos?.filter((p) => p.status === 'ativo').length ?? 0
  const processosConcluidos = processos?.filter((p) => p.status === 'concluido').length ?? 0

  const totalPago = pagamentos?.filter((p) => p.status === 'pago').reduce((acc, p) => acc + p.valor_jpy, 0) ?? 0
  const totalPendente = pagamentos?.filter((p) => p.status === 'pendente').reduce((acc, p) => acc + p.valor_jpy, 0) ?? 0
  const documentosPendentes = documentos?.filter((d) => d.status !== 'aprovado').length ?? 0
  const proximoAgendamento = agendamentos?.find((a) => new Date(a.data_hora_inicio).getTime() >= Date.now())
  const contratosAtivos = contratos?.filter((c) => c.status !== 'cancelado').length ?? 0

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
      ['CNH', cliente.cnh_numero],
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

  const updateProfileField = (field: keyof ProfileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const updateClienteField = (field: keyof ClienteForm, value: string) => {
    setClienteForm((current) => ({ ...current, [field]: value }))
  }

  const addContatoDraft = () => {
    setContatoDrafts((current) => ({
      ...current,
      [`novo-${Date.now()}`]: {
        ddi: '+81',
        numero: '',
        tipo_responsavel: 'pessoal',
        nome_responsavel: null,
        relacao: null,
        tem_whatsapp: true,
        is_principal: Object.keys(current).length === 0,
      },
    }))
    setEditingSection('contatos')
  }

  const addHabilitacaoDraft = () => {
    setHabilitacaoDrafts((current) => ({
      ...current,
      [`novo-${Date.now()}`]: {
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
    setEditingSection('habilitacoes')
  }

  const addEntradaSaidaDraft = () => {
    setEntradaSaidaDrafts((current) => ({
      ...current,
      [`novo-${Date.now()}`]: {
        data_viagem: new Date().toISOString().slice(0, 10),
        tipo: 'entrada',
        observacao: null,
      },
    }))
    setEditingSection('japao')
  }

  const addProcessoDraft = () => {
    setProcessoDrafts((current) => ({
      ...current,
      [`novo-${Date.now()}`]: {
        servico_id: '',
        data_inicio: new Date().toISOString().slice(0, 10),
        valor_acordado_jpy: null,
        status: 'ativo',
        notas: null,
      },
    }))
    setEditingSection('processos')
  }

  const removeLocalDraft = <T,>(setter: Dispatch<SetStateAction<Record<string, T>>>, key: string) => {
    setter((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

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
              <TouchableOpacity style={s.heroBtn} onPress={() => setEditingSection('pessoal')}>
                <Ionicons name="create-outline" size={18} color="white" />
              </TouchableOpacity>
            </View>

            <View style={s.heroProfile}>
              <Avatar name={cliente.profile?.full_name ?? 'Cliente'} size={64} />
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
                icon="wallet-outline"
                label="Financeiro"
                value={totalPendente > 0 ? `${formatJpy(totalPendente)} pendente` : `${formatJpy(totalPago)} pago`}
                color={colors.ok}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'financeiro' } } as any)}
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
                icon="reader-outline"
                label="Contratos"
                value={`${contratosAtivos} contrato(s)`}
                color={colors.navy800}
                onPress={() => router.push({ pathname: '/(admin)/(tabs)/clientes/relacionados', params: { clienteId: id, tipo: 'contratos' } } as any)}
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
              <EditableField label="Nome completo" value={profileForm.full_name} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('full_name', v)} />
              <EditableField
                label="Status do processo"
                value={clienteForm.status_processo}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('status_processo', v)}
                placeholder="prospect, contato, documentacao, agendado..."
              />
              <EditableField
                label="Instrutor responsável"
                value={clienteForm.assigned_instrutor_id}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('assigned_instrutor_id', v)}
                placeholder="ID do instrutor"
              />
              <BooleanField
                label="Perfil ativo"
                value={profileForm.is_active}
                editing={editingSection === 'pessoal'}
                onChange={(value) => setProfileForm((current) => ({ ...current, is_active: value }))}
              />
              <EditableField label="Nome japonês" value={clienteForm.nome_japones} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('nome_japones', v)} />
              <EditableField label="Nascimento" value={editingSection === 'pessoal' ? clienteForm.data_nascimento : safeDate(cliente.data_nascimento, 'd/MM/yyyy')} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('data_nascimento', v)} placeholder="AAAA-MM-DD" />
              <EditableField label="Nacionalidade" value={clienteForm.nacionalidade} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('nacionalidade', v)} />
              <EditableField label="CPF" value={clienteForm.cpf} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('cpf', v)} keyboardType="number-pad" />
              <EditableField label="Zairyu Card" value={clienteForm.zairyu_card} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('zairyu_card', v)} />
              <EditableField label="Visto" value={clienteForm.visto_tipo} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('visto_tipo', v)} />
              <EditableField
                label="Validade visto"
                value={editingSection === 'pessoal' ? clienteForm.visto_validade : safeDate(cliente.visto_validade, 'd/MM/yyyy')}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('visto_validade', v)}
                placeholder="AAAA-MM-DD"
              />
              <EditableField
                label="Profissão"
                value={editingSection === 'pessoal' ? clienteForm.profissao_tipo : cliente.profissao_tipo ? PROFISSAO_LABEL[cliente.profissao_tipo] ?? cliente.profissao_tipo : null}
                editing={editingSection === 'pessoal'}
                onChange={(v) => updateClienteField('profissao_tipo', v)}
                placeholder="autonomo, fabrica, empreiteira..."
              />
              <EditableField label="Empresa" value={clienteForm.profissao_empresa} editing={editingSection === 'pessoal'} onChange={(v) => updateClienteField('profissao_empresa', v)} />
              <EditableField label="E-mail" value={profileForm.email} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('email', v)} keyboardType="email-address" />
              <EditableField label="Telefone" value={profileForm.phone} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('phone', v)} keyboardType="phone-pad" />
              <EditableField label="WhatsApp" value={profileForm.whatsapp} editing={editingSection === 'pessoal'} onChange={(v) => updateProfileField('whatsapp', v)} keyboardType="phone-pad" />
            </View>
            {editingSection === 'pessoal' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar dados pessoais</Text>
              </TouchableOpacity>
            )}

            <SectionHeader
              title="CNH e habilitação base"
              editing={editingSection === 'cnh'}
              onEdit={() => setEditingSection('cnh')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <EditableField label="Número da CNH" value={clienteForm.cnh_numero} editing={editingSection === 'cnh'} onChange={(v) => updateClienteField('cnh_numero', v)} />
              <EditableField label="Categoria" value={clienteForm.cnh_categoria} editing={editingSection === 'cnh'} onChange={(v) => updateClienteField('cnh_categoria', v)} />
              <EditableField label="Validade" value={editingSection === 'cnh' ? clienteForm.cnh_validade : safeDate(cliente.cnh_validade, 'd/MM/yyyy')} editing={editingSection === 'cnh'} onChange={(v) => updateClienteField('cnh_validade', v)} placeholder="AAAA-MM-DD" />
              <EditableField label="Estado emissor" value={clienteForm.cnh_estado_emissor} editing={editingSection === 'cnh'} onChange={(v) => updateClienteField('cnh_estado_emissor', v)} />
            </View>
            {editingSection === 'cnh' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar CNH</Text>
              </TouchableOpacity>
            )}

            {/* ── Endereço JP ── */}
            <SectionHeader
              title="Endereço no Japão"
              editing={editingSection === 'endereco'}
              onEdit={() => setEditingSection('endereco')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <EditableField label="CEP" value={clienteForm.cep_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('cep_jp', v)} keyboardType="number-pad" />
              <EditableField label="Província" value={clienteForm.provincia_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('provincia_jp', v)} />
              <EditableField label="Cidade" value={clienteForm.cidade_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('cidade_jp', v)} />
              <EditableField label="Bairro" value={clienteForm.bairro_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('bairro_jp', v)} />
              <EditableField label="Endereço" value={clienteForm.endereco_jp} editing={editingSection === 'endereco'} onChange={(v) => updateClienteField('endereco_jp', v)} />
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

            {/* ── Contatos ── */}
            <SectionHeader
              title="Contatos"
              editing={editingSection === 'contatos'}
              onEdit={() => setEditingSection('contatos')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addContatoDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar contato</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(contatoDrafts).length > 0 ? (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(contatoDrafts).map(([draftId, draft]) => (
                  <View key={draftId} style={s.editItemCard}>
                    <View style={s.editItemHeader}>
                      <Text style={s.editItemTitle}>{draft.ddi} {draft.numero || 'Novo contato'}</Text>
                      {editingSection === 'contatos' && (
                        <TouchableOpacity
                          style={s.deleteMiniBtn}
                          onPress={() => {
                            if (draftId.startsWith('novo-')) removeLocalDraft(setContatoDrafts, draftId)
                            else deleteContato(db, id, draftId).then(refreshEditableLists)
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.err} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <EditableField label="DDI" value={draft.ddi} editing={editingSection === 'contatos'} onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, ddi: v } }))} />
                    <EditableField label="Número" value={draft.numero} editing={editingSection === 'contatos'} onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, numero: v } }))} keyboardType="phone-pad" />
                    <EditableField label="Responsável" value={draft.nome_responsavel} editing={editingSection === 'contatos'} onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, nome_responsavel: v } }))} />
                    <EditableField label="Relação" value={draft.relacao} editing={editingSection === 'contatos'} onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, relacao: v } }))} />
                    <EditableField label="Tipo" value={editingSection === 'contatos' ? draft.tipo_responsavel : TIPO_RESPONSAVEL_LABEL[draft.tipo_responsavel] ?? draft.tipo_responsavel} editing={editingSection === 'contatos'} onChange={(v) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, tipo_responsavel: v as ClienteContatoInsert['tipo_responsavel'] } }))} placeholder="pessoal, parente ou terceiros" />
                    <BooleanField label="Principal" value={draft.is_principal} editing={editingSection === 'contatos'} onChange={(value) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, is_principal: value } }))} />
                    <BooleanField label="WhatsApp" value={draft.tem_whatsapp} editing={editingSection === 'contatos'} onChange={(value) => setContatoDrafts((current) => ({ ...current, [draftId]: { ...draft, tem_whatsapp: value } }))} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.infoCard}><EmptyState text="Nenhum contato cadastrado" /></View>
            )}
            {editingSection === 'contatos' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveContatosMutation.mutate()} disabled={saveContatosMutation.isPending} activeOpacity={0.85}>
                {saveContatosMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar contatos</Text>
              </TouchableOpacity>
            )}

            {/* ── Habilitações ── */}
            <SectionHeader
              title="Habilitações"
              editing={editingSection === 'habilitacoes'}
              onEdit={() => setEditingSection('habilitacoes')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addHabilitacaoDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar habilitação</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(habilitacaoDrafts).length > 0 ? (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(habilitacaoDrafts).map(([draftId, draft]) => (
                  <View key={draftId} style={s.editItemCard}>
                    <View style={s.editItemHeader}>
                      <Text style={s.editItemTitle}>{draft.pais || 'Nova habilitação'}{draft.categoria ? ` · Cat. ${draft.categoria}` : ''}</Text>
                      {editingSection === 'habilitacoes' && (
                        <TouchableOpacity
                          style={s.deleteMiniBtn}
                          onPress={() => {
                            if (draftId.startsWith('novo-')) removeLocalDraft(setHabilitacaoDrafts, draftId)
                            else deleteHabilitacao(db, id, draftId).then(refreshEditableLists)
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.err} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <EditableField label="País" value={draft.pais} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, pais: v } }))} />
                    <EditableField label="Nome" value={draft.nome_habilitacao} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, nome_habilitacao: v } }))} />
                    <EditableField label="Categoria" value={draft.categoria} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, categoria: v } }))} />
                    <EditableField label="Número" value={draft.numero} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, numero: v } }))} />
                    <EditableField label="Emissão" value={editingSection === 'habilitacoes' ? draft.data_emissao : safeDate(draft.data_emissao, 'd/MM/yyyy')} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, data_emissao: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Validade" value={editingSection === 'habilitacoes' ? draft.data_vencimento : safeDate(draft.data_vencimento, 'd/MM/yyyy')} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, data_vencimento: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Situação" value={draft.situacao} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, situacao: v as ClienteHabilitacaoInsert['situacao'] } }))} placeholder="positiva ou negativa" />
                    <EditableField label="Observações" value={draft.observacoes} editing={editingSection === 'habilitacoes'} onChange={(v) => setHabilitacaoDrafts((current) => ({ ...current, [draftId]: { ...draft, observacoes: v } }))} multiline />
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.infoCard}><EmptyState text="Nenhuma habilitação cadastrada" /></View>
            )}
            {editingSection === 'habilitacoes' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveHabilitacoesMutation.mutate()} disabled={saveHabilitacoesMutation.isPending} activeOpacity={0.85}>
                {saveHabilitacoesMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar habilitações</Text>
              </TouchableOpacity>
            )}

            {/* ── Japão / Visto ── */}
            <SectionHeader
              title="Japão / Visto"
              editing={editingSection === 'japao'}
              onEdit={() => setEditingSection('japao')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.infoCard}>
              <EditableField label="Entrada no Japão" value={editingSection === 'japao' ? clienteForm.data_entrada_japao : safeDate(cliente.data_entrada_japao, 'd/MM/yyyy')} editing={editingSection === 'japao'} onChange={(v) => updateClienteField('data_entrada_japao', v)} placeholder="AAAA-MM-DD" />
            </View>
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addEntradaSaidaDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar viagem</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(entradaSaidaDrafts).length > 0 && (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(entradaSaidaDrafts).map(([draftId, draft]) => (
                  <View key={draftId} style={s.editItemCard}>
                    <View style={s.editItemHeader}>
                      <Text style={s.editItemTitle}>{draft.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {draft.data_viagem}</Text>
                      {editingSection === 'japao' && (
                        <TouchableOpacity
                          style={s.deleteMiniBtn}
                          onPress={() => {
                            if (draftId.startsWith('novo-')) removeLocalDraft(setEntradaSaidaDrafts, draftId)
                            else deleteEntradaSaida(db, id, draftId).then(refreshEditableLists)
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.err} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <EditableField label="Tipo" value={draft.tipo} editing={editingSection === 'japao'} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, tipo: v as ClienteEntradaSaidaInsert['tipo'] } }))} placeholder="entrada ou saida" />
                    <EditableField label="Data" value={editingSection === 'japao' ? draft.data_viagem : safeDate(draft.data_viagem, 'd/MM/yyyy')} editing={editingSection === 'japao'} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, data_viagem: v } }))} placeholder="AAAA-MM-DD" />
                    <EditableField label="Observação" value={draft.observacao} editing={editingSection === 'japao'} onChange={(v) => setEntradaSaidaDrafts((current) => ({ ...current, [draftId]: { ...draft, observacao: v } }))} multiline />
                  </View>
                ))}
              </View>
            )}
            {editingSection === 'japao' && (
              <>
                <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} activeOpacity={0.85}>
                  {saveMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                  <Text style={s.saveBtnTxt}>Salvar visto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.saveBtn} onPress={() => saveEntradasSaidasMutation.mutate()} disabled={saveEntradasSaidasMutation.isPending} activeOpacity={0.85}>
                  {saveEntradasSaidasMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                  <Text style={s.saveBtnTxt}>Salvar viagens</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Processo ativo ── */}
            <SectionHeader
              title="Processos"
              editing={editingSection === 'processos'}
              onEdit={() => setEditingSection('processos')}
              onCancel={() => setEditingSection(null)}
            />
            <View style={s.inlineActions}>
              <TouchableOpacity style={s.lightActionBtn} onPress={addProcessoDraft} activeOpacity={0.85}>
                <Ionicons name="add" size={14} color={colors.navy800} />
                <Text style={s.lightActionTxt}>Adicionar processo</Text>
              </TouchableOpacity>
            </View>
            {Object.entries(processoDrafts).length > 0 ? (
              <View style={{ gap: 10, marginBottom: 22 }}>
                {Object.entries(processoDrafts).map(([draftId, draft]) => {
                  const processo = processos?.find((p) => p.id === draftId)
                  return (
                    <View key={draftId} style={s.editItemCard}>
                      <View style={s.editItemHeader}>
                        <Text style={s.editItemTitle}>{processo?.servico?.nome ?? 'Processo'}</Text>
                        {editingSection === 'processos' && (
                          <TouchableOpacity
                            style={s.deleteMiniBtn}
                            onPress={() => {
                              if (draftId.startsWith('novo-')) removeLocalDraft(setProcessoDrafts, draftId)
                              else deleteProcesso(db, draftId).then(refreshEditableLists)
                            }}
                          >
                            <Ionicons name="trash-outline" size={14} color={colors.err} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <EditableField label="ID do serviço" value={draft.servico_id} editing={editingSection === 'processos'} onChange={(v) => setProcessoDrafts((current) => ({ ...current, [draftId]: { ...draft, servico_id: v } }))} />
                      <EditableField label="Status" value={draft.status} editing={editingSection === 'processos'} onChange={(v) => setProcessoDrafts((current) => ({ ...current, [draftId]: { ...draft, status: v as StatusClienteProcesso } }))} placeholder="ativo, concluido ou cancelado" />
                      <EditableField label="Início" value={editingSection === 'processos' ? draft.data_inicio : safeDate(draft.data_inicio, 'd/MM/yyyy')} editing={editingSection === 'processos'} onChange={(v) => setProcessoDrafts((current) => ({ ...current, [draftId]: { ...draft, data_inicio: v } }))} placeholder="AAAA-MM-DD" />
                      <EditableField label="Valor acordado" value={draft.valor_acordado_jpy === null ? null : String(draft.valor_acordado_jpy)} editing={editingSection === 'processos'} onChange={(v) => setProcessoDrafts((current) => ({ ...current, [draftId]: { ...draft, valor_acordado_jpy: numberOrNull(v) } }))} keyboardType="number-pad" />
                      <EditableField label="Notas" value={draft.notas} editing={editingSection === 'processos'} onChange={(v) => setProcessoDrafts((current) => ({ ...current, [draftId]: { ...draft, notas: v } }))} multiline />
                    </View>
                  )
                })}
              </View>
            ) : (
              <View style={s.infoCard}><EmptyState text="Nenhum processo cadastrado" /></View>
            )}
            {editingSection === 'processos' && (
              <TouchableOpacity style={s.saveBtn} onPress={() => saveProcessosMutation.mutate()} disabled={saveProcessosMutation.isPending} activeOpacity={0.85}>
                {saveProcessosMutation.isPending ? <ActivityIndicator color={colors.white} /> : <Ionicons name="save-outline" size={16} color={colors.white} />}
                <Text style={s.saveBtnTxt}>Salvar processos</Text>
              </TouchableOpacity>
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
  deleteMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },

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
