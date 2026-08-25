import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db, storage } from '@/lib/firebase'
import { AppImage } from '@/components/AppImage'
import { colors } from '@/theme'
import { useAuthStore } from '@/stores/auth.store'
import { getClienteByProfileId, updateCliente } from '@ueno/firebase/queries/clientes'
import { updateProfile } from '@ueno/firebase/queries/perfis'
import { createProcesso } from '@ueno/firebase/queries/processos'
import { createContato, listContatosByCliente } from '@ueno/firebase/queries/contatos'
import { createHabilitacao, listHabilitacoesByCliente } from '@ueno/firebase/queries/habilitacoes'
import { createEntradaSaida, listEntradasSaidasByCliente } from '@ueno/firebase/queries/entradas_saidas'
import {
  createClienteDocumento,
  getClienteDocumentos,
  listDocumentoTemplatesByServico,
  uploadDocumento,
} from '@ueno/firebase/queries/documentos'
import { getServico } from '@ueno/firebase/queries/servicos'
import { listVariacoesByServico } from '@ueno/firebase/queries/servico_variacoes'
import { listEtapaTemplatesByServico } from '@ueno/firebase/queries/etapa_templates'
import type { ClienteInsert, DocumentoTemplate, EtapaTemplate, ProfissaoTipo, ResponsavelEtapa, Servico, ServicoVariacao } from '@ueno/firebase'

const responsavelLabel: Record<ResponsavelEtapa, string> = {
  cliente: 'Cliente',
  assessoria: 'Assessoria',
  menkyocenter: 'Menkyo Center',
  outros: 'Outros',
}

function formatPreco(item: Pick<Servico | ServicoVariacao, 'preco_variavel' | 'preco_jpy' | 'preco_min_jpy' | 'preco_max_jpy'>) {
  if (item.preco_variavel && item.preco_min_jpy != null && item.preco_max_jpy != null) {
    return `¥ ${item.preco_min_jpy.toLocaleString('ja-JP')} - ¥ ${item.preco_max_jpy.toLocaleString('ja-JP')}`
  }
  return item.preco_jpy != null ? `¥ ${item.preco_jpy.toLocaleString('ja-JP')}` : 'Sob consulta'
}

function getStepVariacaoLabel(template: EtapaTemplate, variacoes: ServicoVariacao[]) {
  if (variacoes.length === 0) return null
  if (template.variacao_ids.length === 0) return 'Todas as variações'
  const names = template.variacao_ids
    .map((id) => variacoes.find((variacao) => variacao.id === id)?.nome)
    .filter(Boolean)
  return names.length > 0 ? names.join(', ') : null
}

type ContractStep = 'pessoais' | 'contatos' | 'habilitacao' | 'visto' | 'endereco' | 'documentos'

type ContractForm = {
  full_name: string
  cpf: string
  data_nascimento: string
  nome_japones: string
  nacionalidade: string
  telefone: string
  whatsapp: string
  contato_tem_whatsapp: boolean
  cnh_numero: string
  cnh_categoria: string
  cnh_validade: string
  cnh_estado_emissor: string
  profissao_tipo: ProfissaoTipo | ''
  profissao_empresa: string
  observacoes: string
  data_entrada_japao: string
  visto_tipo: string
  visto_validade: string
  zairyu_card: string
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

const CONTRACT_STEPS: Array<{ key: ContractStep; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'pessoais', label: 'Dados', icon: 'person-outline' },
  { key: 'contatos', label: 'Contato', icon: 'call-outline' },
  { key: 'habilitacao', label: 'CNH', icon: 'card-outline' },
  { key: 'visto', label: 'Visto', icon: 'id-card-outline' },
  { key: 'endereco', label: 'Endereço', icon: 'location-outline' },
  { key: 'documentos', label: 'Docs', icon: 'cloud-upload-outline' },
]

const emptyForm: ContractForm = {
  full_name: '',
  cpf: '',
  data_nascimento: '',
  nome_japones: '',
  nacionalidade: '',
  telefone: '',
  whatsapp: '',
  contato_tem_whatsapp: true,
  cnh_numero: '',
  cnh_categoria: '',
  cnh_validade: '',
  cnh_estado_emissor: '',
  profissao_tipo: '',
  profissao_empresa: '',
  observacoes: '',
  data_entrada_japao: '',
  visto_tipo: '',
  visto_validade: '',
  zairyu_card: '',
  cep_jp: '',
  provincia_jp: '',
  cidade_jp: '',
  bairro_jp: '',
  numero_bloco_jp: '',
  apartamento_jp: '',
  complemento_jp: '',
  endereco_jp: '',
  mapa_link_jp: '',
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

export default function ServicoDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const queryClient = useQueryClient()
  const serviceId = typeof id === 'string' ? id : undefined
  const [imageFailed, setImageFailed] = useState(false)
  const [selectedVariacaoId, setSelectedVariacaoId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStepIndex, setWizardStepIndex] = useState(0)
  const [contractForm, setContractForm] = useState<ContractForm>(emptyForm)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, DocumentPicker.DocumentPickerAsset[]>>({})
  const [genericFiles, setGenericFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([])

  const { data: servico, isLoading: isLoadingServico } = useQuery({
    queryKey: ['servicos', serviceId],
    queryFn: () => getServico(db, serviceId!),
    enabled: !!serviceId,
  })

  const { data: variacoes, isLoading: isLoadingVariacoes } = useQuery({
    queryKey: ['servico-variacoes', serviceId, 'active'],
    queryFn: () => listVariacoesByServico(db, serviceId!, true),
    enabled: !!serviceId,
  })

  const { data: etapas, isLoading: isLoadingEtapas } = useQuery({
    queryKey: ['etapa-templates', serviceId],
    queryFn: () => listEtapaTemplatesByServico(db, serviceId!),
    enabled: !!serviceId,
  })

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: documentosSolicitados = [], isLoading: isLoadingDocumentos } = useQuery({
    queryKey: ['documento-templates', serviceId, selectedVariacaoId],
    queryFn: () => listDocumentoTemplatesByServico(db, serviceId!, selectedVariacaoId),
    enabled: !!serviceId,
  })

  const { data: documentosCliente = [] } = useQuery({
    queryKey: ['cliente', cliente?.id, 'documentos'],
    queryFn: () => getClienteDocumentos(db, cliente!.id),
    enabled: !!cliente,
  })

  const { data: contatosCliente = [] } = useQuery({
    queryKey: ['cliente', cliente?.id, 'contatos'],
    queryFn: () => listContatosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const { data: habilitacoesCliente = [] } = useQuery({
    queryKey: ['cliente', cliente?.id, 'habilitacoes'],
    queryFn: () => listHabilitacoesByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const { data: entradasCliente = [] } = useQuery({
    queryKey: ['cliente', cliente?.id, 'entrada_saida'],
    queryFn: () => listEntradasSaidasByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const activeVariacoes = variacoes ?? []
  const selectedVariacao = activeVariacoes.find((variacao) => variacao.id === selectedVariacaoId) ?? null

  useEffect(() => {
    if (!selectedVariacaoId && activeVariacoes.length > 0) {
      setSelectedVariacaoId(activeVariacoes[0]!.id)
    }
  }, [activeVariacoes, selectedVariacaoId])

  useEffect(() => {
    if (!cliente) return
    setContractForm({
      full_name: cliente.profile.full_name ?? '',
      cpf: cliente.cpf ?? '',
      data_nascimento: cliente.data_nascimento ?? '',
      nome_japones: cliente.nome_japones ?? '',
      nacionalidade: cliente.nacionalidade ?? '',
      telefone: cliente.profile.phone ?? '',
      whatsapp: cliente.profile.whatsapp ?? '',
      contato_tem_whatsapp: true,
      cnh_numero: cliente.cnh_numero ?? '',
      cnh_categoria: cliente.cnh_categoria ?? '',
      cnh_validade: cliente.cnh_validade ?? '',
      cnh_estado_emissor: cliente.cnh_estado_emissor ?? '',
      profissao_tipo: cliente.profissao_tipo ?? '',
      profissao_empresa: cliente.profissao_empresa ?? '',
      observacoes: cliente.observacoes ?? '',
      data_entrada_japao: cliente.data_entrada_japao ?? '',
      visto_tipo: cliente.visto_tipo ?? '',
      visto_validade: cliente.visto_validade ?? '',
      zairyu_card: cliente.zairyu_card ?? '',
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

  const submitContractMutation = useMutation({
    mutationFn: async () => {
      if (!cliente) throw new Error('Cliente não encontrado.')
      const clienteAtual = cliente

      const clientePayload: Partial<ClienteInsert> = {
        cpf: emptyToNull(contractForm.cpf),
        data_nascimento: emptyToNull(contractForm.data_nascimento),
        nome_japones: emptyToNull(contractForm.nome_japones),
        nacionalidade: emptyToNull(contractForm.nacionalidade),
        cnh_numero: emptyToNull(contractForm.cnh_numero),
        cnh_categoria: emptyToNull(contractForm.cnh_categoria),
        cnh_validade: emptyToNull(contractForm.cnh_validade),
        cnh_estado_emissor: emptyToNull(contractForm.cnh_estado_emissor),
        profissao_tipo: contractForm.profissao_tipo || null,
        profissao_empresa: emptyToNull(contractForm.profissao_empresa),
        observacoes: emptyToNull(contractForm.observacoes),
        data_entrada_japao: emptyToNull(contractForm.data_entrada_japao),
        visto_tipo: emptyToNull(contractForm.visto_tipo),
        visto_validade: emptyToNull(contractForm.visto_validade),
        zairyu_card: emptyToNull(contractForm.zairyu_card),
        cep_jp: emptyToNull(contractForm.cep_jp),
        provincia_jp: emptyToNull(contractForm.provincia_jp),
        cidade_jp: emptyToNull(contractForm.cidade_jp),
        bairro_jp: emptyToNull(contractForm.bairro_jp),
        numero_bloco_jp: emptyToNull(contractForm.numero_bloco_jp),
        apartamento_jp: emptyToNull(contractForm.apartamento_jp),
        complemento_jp: emptyToNull(contractForm.complemento_jp),
        endereco_jp: emptyToNull(contractForm.endereco_jp),
        mapa_link_jp: emptyToNull(contractForm.mapa_link_jp),
      }

      await Promise.all([
        updateCliente(db, clienteAtual.id, clientePayload),
        updateProfile(db, clienteAtual.profile_id, {
          full_name: contractForm.full_name.trim() || clienteAtual.profile.full_name,
          phone: emptyToNull(contractForm.telefone),
          whatsapp: emptyToNull(contractForm.whatsapp),
        }),
      ])

      const telefone = contractForm.telefone.trim()
      if (telefone && !contatosCliente.some((contato) => contato.numero === telefone)) {
        await createContato(db, {
          cliente_id: clienteAtual.id,
          ddi: telefone.startsWith('+55') ? '+55' : '+81',
          numero: telefone,
          tipo_responsavel: 'pessoal',
          nome_responsavel: null,
          relacao: null,
          tem_whatsapp: contractForm.contato_tem_whatsapp,
          is_principal: true,
        })
      }

      const cnhNumero = contractForm.cnh_numero.trim()
      if (
        (cnhNumero || contractForm.cnh_categoria.trim())
        && !habilitacoesCliente.some((habilitacao) => habilitacao.numero === cnhNumero && cnhNumero)
      ) {
        await createHabilitacao(db, {
          cliente_id: clienteAtual.id,
          pais: 'Brasil',
          categoria: emptyToNull(contractForm.cnh_categoria),
          nome_habilitacao: null,
          numero: emptyToNull(contractForm.cnh_numero),
          data_emissao: null,
          data_vencimento: emptyToNull(contractForm.cnh_validade),
          observacoes: emptyToNull(contractForm.cnh_estado_emissor),
          situacao: 'positiva',
        })
      }

      const dataEntrada = contractForm.data_entrada_japao.trim()
      if (dataEntrada && !entradasCliente.some((entrada) => entrada.tipo === 'entrada' && entrada.data_viagem === dataEntrada)) {
        await createEntradaSaida(db, {
          cliente_id: clienteAtual.id,
          data_viagem: dataEntrada,
          tipo: 'entrada',
          observacao: emptyToNull(contractForm.visto_tipo),
        })
      }

      async function uploadAndCreateDocumento(
        file: DocumentPicker.DocumentPickerAsset,
        template: DocumentoTemplate | null,
      ) {
        const blob = await localUriToBlob(file.uri)
        let path: string
        try {
          path = await uploadDocumento(storage, clienteAtual.id, blob, file.name ?? `${template?.nome ?? 'documento'}.pdf`)
        } finally {
          ;(blob as Blob & { close?: () => void }).close?.()
        }
        await createClienteDocumento(db, {
          cliente_id: clienteAtual.id,
          template_id: template?.id ?? null,
          nome_custom: template ? null : 'Documento para análise',
          status: 'enviado',
          arquivo_url: path,
          arquivo_nome: file.name ?? template?.nome ?? 'Documento',
          arquivo_tamanho: file.size ?? null,
          arquivo_tipo: file.mimeType ?? null,
          data_validade: null,
          observacao: `Solicitação pelo serviço ${servico?.nome ?? ''}${selectedVariacao ? ` - ${selectedVariacao.nome}` : ''}`.trim(),
          revisado_por: null,
          revisado_em: null,
        })
      }

      for (const template of documentosSolicitados) {
        for (const file of selectedFiles[template.id] ?? []) {
          await uploadAndCreateDocumento(file, template)
        }
      }

      for (const file of genericFiles) {
        await uploadAndCreateDocumento(file, null)
      }

      await createProcesso(db, {
        cliente_id: clienteAtual.id,
        servico_id: serviceId!,
        variacao_id: selectedVariacao?.id ?? null,
        data_inicio: null,
        valor_acordado_jpy: null,
        status: 'analise',
        notas: `Solicitação enviada pelo app para análise.${contractForm.whatsapp.trim() ? ` WhatsApp: ${contractForm.whatsapp.trim()}.` : ''}`,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cliente', 'me', session?.userId] }),
        queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'documentos'] }),
        queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'contatos'] }),
        queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'habilitacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['cliente', cliente?.id, 'entrada_saida'] }),
        queryClient.invalidateQueries({ queryKey: ['processos', cliente?.id] }),
        queryClient.invalidateQueries({ queryKey: ['processos', cliente?.id, 'tabs'] }),
      ])
      setWizardOpen(false)
      setWizardStepIndex(0)
      setSelectedFiles({})
      setGenericFiles([])
      Alert.alert('Solicitação enviada', 'Recebemos seus dados e documentos para análise.')
    },
    onError: (error) => {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Confira os dados e tente novamente.')
    },
  })

  const visibleEtapas = useMemo(() => {
    const allEtapas = etapas ?? []
    if (!selectedVariacao) return allEtapas
    return allEtapas.filter((etapa) => (
      etapa.variacao_ids.length === 0 || etapa.variacao_ids.includes(selectedVariacao.id)
    ))
  }, [etapas, selectedVariacao])

  const detailPrice = selectedVariacao ? formatPreco(selectedVariacao) : servico ? formatPreco(servico) : null
  const detailDuration = selectedVariacao?.duracao_texto ?? servico?.duracao_texto ?? null
  const imageUri = servico?.imagem_url?.trim()
  const optionCount = activeVariacoes.length || 1
  const currentWizardStep = CONTRACT_STEPS[wizardStepIndex]!
  const requiredMissing = documentosSolicitados.some((template) => (
    template.obrigatorio
    && !(selectedFiles[template.id]?.length)
    && !documentosCliente.some((doc) => doc.template_id === template.id && !!doc.arquivo_url)
  ))

  function updateContractField<K extends keyof ContractForm>(field: K, value: ContractForm[K]) {
    setContractForm((current) => ({ ...current, [field]: value }))
  }

  function openWizard() {
    if (!session) {
      Alert.alert('Login necessário', 'Entre na sua conta para contratar este serviço.')
      return
    }
    if (activeVariacoes.length > 0 && !selectedVariacao) {
      Alert.alert('Selecione uma variação', 'Escolha uma opção do serviço antes de continuar.')
      return
    }
    setWizardStepIndex(0)
    setWizardOpen(true)
  }

  async function pickDocument(template: DocumentoTemplate) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: true,
    })
    if (result.canceled || !result.assets[0]) return
    setSelectedFiles((current) => ({
      ...current,
      [template.id]: [...(current[template.id] ?? []), ...result.assets],
    }))
  }

  async function pickGenericDocuments() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: true,
    })
    if (result.canceled || !result.assets[0]) return
    setGenericFiles((current) => [...current, ...result.assets])
  }

  function removeTemplateFile(templateId: string, index: number) {
    setSelectedFiles((current) => ({
      ...current,
      [templateId]: (current[templateId] ?? []).filter((_, fileIndex) => fileIndex !== index),
    }))
  }

  function removeGenericFile(index: number) {
    setGenericFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
  }

  function goNextStep() {
    if (wizardStepIndex < CONTRACT_STEPS.length - 1) {
      setWizardStepIndex((current) => current + 1)
      return
    }
    if (requiredMissing) {
      Alert.alert('Documentos obrigatórios', 'Envie todos os documentos obrigatórios antes de finalizar.')
      return
    }
    submitContractMutation.mutate()
  }

  if (isLoadingServico) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color={colors.navy800} />
      </SafeAreaView>
    )
  }

  if (!servico) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={s.emptyTitle}>Serviço não encontrado</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => router.replace('/(cliente)/(tabs)/catalogos')} activeOpacity={0.85}>
          <Text style={s.emptyBtnTxt}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          {imageUri && !imageFailed ? (
            <AppImage
              source={{ uri: imageUri }}
              style={s.heroImage}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={s.heroFallback}>
              <View style={s.sun} />
              <View style={s.mountainBack} />
              <View style={s.mountainFront} />
              <View style={s.road} />
              <View style={s.roadLine} />
              <Text style={s.heroKanji}>上野</Text>
            </View>
          )}
          <View style={s.heroShade} />
          <View style={s.heroTop}>
            <TouchableOpacity style={s.heroIconBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <View style={s.heroBadge}>
              <Ionicons name="layers-outline" size={13} color="#FBBF24" />
              <Text style={s.heroBadgeTxt}>Serviço Ueno</Text>
            </View>
          </View>
        </View>

        <View style={s.panel}>
          <Text style={s.title}>{servico.nome}</Text>
          <View style={s.metaRow}>
            <View style={s.starRow}>
              {[0, 1, 2, 3, 4].map((star) => (
                <Ionicons key={star} name="star" size={14} color="#FBBF24" />
              ))}
            </View>
            {detailDuration ? <Text style={s.metaTxt}>· {detailDuration}</Text> : null}
            <Text style={s.metaTxt}>· {optionCount} {optionCount === 1 ? 'opção' : 'opções'}</Text>
          </View>

          {servico.descricao ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Sobre o serviço</Text>
              <Text style={s.description}>{servico.descricao}</Text>
            </View>
          ) : null}

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Variações</Text>
              {isLoadingVariacoes ? <ActivityIndicator size="small" color={colors.navy800} /> : null}
            </View>
            {activeVariacoes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.variationsRow}>
                {activeVariacoes.map((variacao) => {
                  const isSelected = selectedVariacaoId === variacao.id
                  return (
                    <TouchableOpacity
                      key={variacao.id}
                      style={[s.variationCard, isSelected && s.variationCardActive]}
                      onPress={() => setSelectedVariacaoId(variacao.id)}
                      activeOpacity={0.85}
                    >
                      <View style={s.variationTop}>
                        <Text style={[s.variationName, isSelected && s.variationNameActive]} numberOfLines={2}>
                          {variacao.nome}
                        </Text>
                        {isSelected ? <Ionicons name="checkmark-circle" size={18} color={colors.white} /> : null}
                      </View>
                      <Text style={[s.variationPrice, isSelected && s.variationPriceActive]}>
                        {formatPreco(variacao)}
                      </Text>
                      {variacao.duracao_texto ? (
                        <Text style={[s.variationMeta, isSelected && s.variationMetaActive]}>
                          {variacao.duracao_texto}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            ) : (
              <View style={s.plainBox}>
                <Text style={s.plainTitle}>{formatPreco(servico)}</Text>
                <Text style={s.plainTxt}>
                  {servico.preco_variavel ? 'Valor apresentado em faixa para este serviço.' : 'Este serviço não possui variações ativas.'}
                </Text>
              </View>
            )}

            <View style={s.selectedSummary}>
              <Text style={s.selectedSummaryLabel}>Selecionado</Text>
              <Text style={s.selectedSummaryTitle}>
                {selectedVariacao?.nome ?? servico.nome}
              </Text>
              {selectedVariacao?.descricao ? (
                <Text style={s.selectedSummaryDesc}>{selectedVariacao.descricao}</Text>
              ) : null}
            </View>
          </View>

          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Etapas incluídas</Text>
              {isLoadingEtapas ? <ActivityIndicator size="small" color={colors.navy800} /> : null}
            </View>
            {visibleEtapas.length > 0 ? (
              <View style={s.timeline}>
                {visibleEtapas.map((etapa, index) => (
                  <StepRow
                    key={etapa.id}
                    etapa={etapa}
                    index={index}
                    isLast={index === visibleEtapas.length - 1}
                    variacoes={activeVariacoes}
                  />
                ))}
              </View>
            ) : (
              <View style={s.plainBox}>
                <Text style={s.plainTitle}>Nenhuma etapa cadastrada</Text>
                <Text style={s.plainTxt}>Quando a assessoria configurar as etapas no web, elas aparecerão aqui.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bottomLabel}>A partir de</Text>
          <Text style={s.bottomPrice} numberOfLines={1}>{detailPrice ?? 'Sob consulta'}</Text>
        </View>
        <TouchableOpacity
          style={s.bottomBtn}
          onPress={openWizard}
          activeOpacity={0.88}
        >
          <Text style={s.bottomBtnTxt}>Contratar agora</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={wizardOpen} animationType="slide" onRequestClose={() => setWizardOpen(false)}>
        <View style={[s.wizardSafe, { paddingTop: Math.max(insets.top, 24) }]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.wizardHeader}>
              <TouchableOpacity style={s.wizardClose} onPress={() => setWizardOpen(false)}>
                <Ionicons name="close" size={22} color={colors.ink700} />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.wizardTitle}>Contratar serviço</Text>
                <Text style={s.wizardSubtitle} numberOfLines={1}>
                  {selectedVariacao?.nome ?? servico.nome}
                </Text>
              </View>
            </View>

            <View style={s.stepTabs}>
              {CONTRACT_STEPS.map((step, index) => {
                const active = step.key === currentWizardStep.key
                const done = index < wizardStepIndex
                return (
                  <TouchableOpacity
                    key={step.key}
                    style={[s.stepTab, active && s.stepTabActive, done && s.stepTabDone]}
                    onPress={() => setWizardStepIndex(index)}
                  >
                    <Ionicons name={step.icon} size={16} color={active ? colors.white : done ? colors.ok : colors.ink500} />
                    <Text style={[s.stepTabText, active && s.stepTabTextActive]} numberOfLines={1}>{step.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <ScrollView contentContainerStyle={s.wizardContent} keyboardShouldPersistTaps="handled">
              {currentWizardStep.key === 'pessoais' ? (
                <WizardCard icon="person-outline" title="Dados pessoais">
                  <WizardField label="Nome completo" value={contractForm.full_name} onChangeText={(value) => updateContractField('full_name', value)} />
                  <WizardField label="CPF" value={contractForm.cpf} onChangeText={(value) => updateContractField('cpf', value)} placeholder="000.000.000-00" keyboardType="number-pad" />
                  <WizardField label="Data de nascimento" value={contractForm.data_nascimento} onChangeText={(value) => updateContractField('data_nascimento', value)} placeholder="AAAA-MM-DD" />
                  <WizardField label="Nome em japones" value={contractForm.nome_japones} onChangeText={(value) => updateContractField('nome_japones', value)} placeholder="Katakana ou Kanji" />
                  <WizardField label="Nacionalidade" value={contractForm.nacionalidade} onChangeText={(value) => updateContractField('nacionalidade', value)} placeholder="Brasil" />
                  <WizardField label="Observações" value={contractForm.observacoes} onChangeText={(value) => updateContractField('observacoes', value)} multiline />
                </WizardCard>
              ) : null}

              {currentWizardStep.key === 'contatos' ? (
                <WizardCard icon="call-outline" title="Contato principal">
                  <WizardField label="Telefone" value={contractForm.telefone} onChangeText={(value) => updateContractField('telefone', value)} placeholder="+81 90 0000 0000" keyboardType="phone-pad" />
                  <WizardField label="WhatsApp" value={contractForm.whatsapp} onChangeText={(value) => updateContractField('whatsapp', value)} placeholder="+81 90 0000 0000" keyboardType="phone-pad" />
                  <TouchableOpacity
                    style={s.toggleRow}
                    onPress={() => updateContractField('contato_tem_whatsapp', !contractForm.contato_tem_whatsapp)}
                  >
                    <View>
                      <Text style={s.toggleTitle}>Este número tem WhatsApp</Text>
                      <Text style={s.toggleSub}>Usaremos para mensagens rápidas sobre a análise.</Text>
                    </View>
                    <Ionicons name={contractForm.contato_tem_whatsapp ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={contractForm.contato_tem_whatsapp ? colors.ok : colors.ink300} />
                  </TouchableOpacity>
                </WizardCard>
              ) : null}

              {currentWizardStep.key === 'habilitacao' ? (
                <WizardCard icon="card-outline" title="Habilitação">
                  <WizardField label="Número da CNH" value={contractForm.cnh_numero} onChangeText={(value) => updateContractField('cnh_numero', value)} />
                  <WizardField label="Categoria" value={contractForm.cnh_categoria} onChangeText={(value) => updateContractField('cnh_categoria', value)} placeholder="Ex: B, AB" />
                  <WizardField label="Validade" value={contractForm.cnh_validade} onChangeText={(value) => updateContractField('cnh_validade', value)} placeholder="AAAA-MM-DD" />
                  <WizardField label="Estado emissor" value={contractForm.cnh_estado_emissor} onChangeText={(value) => updateContractField('cnh_estado_emissor', value)} placeholder="Ex: SP" />
                  <Text style={s.wizardLabel}>Tipo de trabalho</Text>
                  <View style={s.optionGrid}>
                    {([
                      ['', 'Selecionar'],
                      ['autonomo', 'Autônomo'],
                      ['nao_trabalha', 'Não trabalha'],
                      ['empreiteira', 'Empreiteira'],
                      ['fabrica', 'Fábrica'],
                      ['outros', 'Outros'],
                    ] as const).map(([value, label]) => {
                      const active = contractForm.profissao_tipo === value
                      return (
                        <TouchableOpacity
                          key={value || 'empty'}
                          style={[s.optionChip, active && s.optionChipActive]}
                          onPress={() => updateContractField('profissao_tipo', value as ProfissaoTipo | '')}
                        >
                          <Text style={[s.optionChipText, active && s.optionChipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                  <WizardField label="Empresa / empreiteira / fábrica" value={contractForm.profissao_empresa} onChangeText={(value) => updateContractField('profissao_empresa', value)} />
                </WizardCard>
              ) : null}

              {currentWizardStep.key === 'visto' ? (
                <WizardCard icon="id-card-outline" title="Visto e entrada no Japão">
                  <WizardField label="Zairyu Card / Japanese ID" value={contractForm.zairyu_card} onChangeText={(value) => updateContractField('zairyu_card', value)} />
                  <WizardField label="Tipo de visto" value={contractForm.visto_tipo} onChangeText={(value) => updateContractField('visto_tipo', value)} placeholder="Conjuge, Trabalho, Estudante..." />
                  <WizardField label="Validade do visto" value={contractForm.visto_validade} onChangeText={(value) => updateContractField('visto_validade', value)} placeholder="AAAA-MM-DD" />
                  <WizardField label="Data de entrada no Japão" value={contractForm.data_entrada_japao} onChangeText={(value) => updateContractField('data_entrada_japao', value)} placeholder="AAAA-MM-DD" />
                </WizardCard>
              ) : null}

              {currentWizardStep.key === 'endereco' ? (
                <WizardCard icon="location-outline" title="Endereço no Japão">
                  <WizardField label="CEP" value={contractForm.cep_jp} onChangeText={(value) => updateContractField('cep_jp', value)} placeholder="000-0000" keyboardType="number-pad" />
                  <WizardField label="Província" value={contractForm.provincia_jp} onChangeText={(value) => updateContractField('provincia_jp', value)} />
                  <WizardField label="Cidade" value={contractForm.cidade_jp} onChangeText={(value) => updateContractField('cidade_jp', value)} />
                  <WizardField label="Bairro" value={contractForm.bairro_jp} onChangeText={(value) => updateContractField('bairro_jp', value)} />
                  <WizardField label="Número / bloco" value={contractForm.numero_bloco_jp} onChangeText={(value) => updateContractField('numero_bloco_jp', value)} />
                  <WizardField label="Apartamento" value={contractForm.apartamento_jp} onChangeText={(value) => updateContractField('apartamento_jp', value)} />
                  <WizardField label="Complemento" value={contractForm.complemento_jp} onChangeText={(value) => updateContractField('complemento_jp', value)} />
                  <WizardField label="Endereço livre" value={contractForm.endereco_jp} onChangeText={(value) => updateContractField('endereco_jp', value)} multiline />
                  <WizardField label="Link do Google Maps" value={contractForm.mapa_link_jp} onChangeText={(value) => updateContractField('mapa_link_jp', value)} placeholder="https://maps.google.com/..." />
                </WizardCard>
              ) : null}

              {currentWizardStep.key === 'documentos' ? (
                <WizardCard icon="cloud-upload-outline" title="Documentos para análise">
                  {isLoadingDocumentos ? <ActivityIndicator color={colors.navy800} /> : null}
                  {!isLoadingDocumentos ? (
                    <View style={s.freeUploadBox}>
                      <View style={s.emptyDocs}>
                        <Ionicons name="document-text-outline" size={24} color={colors.ink400} />
                        <Text style={s.emptyDocsTitle}>
                          {documentosSolicitados.length === 0
                            ? 'Nenhum documento configurado'
                            : 'Documentos complementares'}
                        </Text>
                        <Text style={s.emptyDocsText}>
                          {documentosSolicitados.length === 0
                            ? 'Você ainda pode enviar PDFs ou imagens para a equipe analisar.'
                            : 'Envie arquivos extras que ajudem a equipe na análise.'}
                        </Text>
                      </View>
                      <TouchableOpacity style={s.addFilesBtn} onPress={pickGenericDocuments}>
                        <Ionicons name="add" size={17} color={colors.white} />
                        <Text style={s.addFilesText}>Adicionar complementares</Text>
                      </TouchableOpacity>
                      {genericFiles.length > 0 ? (
                        <View style={s.fileList}>
                          {genericFiles.map((file, index) => (
                            <FilePill key={`${file.uri}-${index}`} file={file} onRemove={() => removeGenericFile(index)} />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {documentosSolicitados.map((template) => {
                    const files = selectedFiles[template.id] ?? []
                    const alreadySent = documentosCliente.some((doc) => doc.template_id === template.id && !!doc.arquivo_url)
                    return (
                      <View key={template.id} style={s.docItem}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={s.docTitleRow}>
                            <Text style={s.docName}>{template.nome}</Text>
                            <Text style={[s.docBadge, !template.obrigatorio && s.docBadgeOptional]}>
                              {template.obrigatorio ? 'Obrigatório' : 'Opcional'}
                            </Text>
                          </View>
                          {template.descricao ? <Text style={s.docDesc}>{template.descricao}</Text> : null}
                          <Text style={s.docFile} numberOfLines={1}>
                            {files.length > 0
                              ? `${files.length} arquivo(s) selecionado(s)`
                              : alreadySent ? 'Documento já enviado' : 'Nenhum arquivo selecionado'}
                          </Text>
                          {files.length > 0 ? (
                            <View style={s.fileList}>
                              {files.map((file, index) => (
                                <FilePill
                                  key={`${template.id}-${file.uri}-${index}`}
                                  file={file}
                                  onRemove={() => removeTemplateFile(template.id, index)}
                                />
                              ))}
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity style={s.docBtn} onPress={() => pickDocument(template)}>
                          <Ionicons name={files.length > 0 || alreadySent ? 'add' : 'cloud-upload-outline'} size={17} color={colors.navy800} />
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </WizardCard>
              ) : null}
            </ScrollView>

            <View style={[s.wizardFooter, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              <TouchableOpacity
                style={[s.footerBtn, s.footerSecondary, wizardStepIndex === 0 && s.footerDisabled]}
                onPress={() => setWizardStepIndex((current) => Math.max(0, current - 1))}
                disabled={wizardStepIndex === 0}
              >
                <Text style={s.footerSecondaryText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.footerBtn, s.footerPrimary, submitContractMutation.isPending && s.footerDisabled]}
                onPress={goNextStep}
                disabled={submitContractMutation.isPending}
              >
                <Text style={s.footerPrimaryText}>
                  {wizardStepIndex === CONTRACT_STEPS.length - 1
                    ? submitContractMutation.isPending ? 'Enviando...' : 'Enviar análise'
                    : 'Continuar'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function StepRow({
  etapa,
  index,
  isLast,
  variacoes,
}: {
  etapa: EtapaTemplate
  index: number
  isLast: boolean
  variacoes: ServicoVariacao[]
}) {
  const variacaoLabel = getStepVariacaoLabel(etapa, variacoes)

  return (
    <View style={s.stepRow}>
      <View style={s.stepRail}>
        <View style={s.stepDot}>
          <Text style={s.stepDotTxt}>{index + 1}</Text>
        </View>
        {!isLast ? <View style={s.stepLine} /> : null}
      </View>
      <View style={s.stepBody}>
        <View style={s.stepTitleRow}>
          <Text style={s.stepTitle}>{etapa.nome}</Text>
          <View style={s.responsavelPill}>
            <Text style={s.responsavelTxt}>{responsavelLabel[etapa.responsavel_padrao]}</Text>
          </View>
        </View>
        {etapa.descricao ? <Text style={s.stepDesc}>{etapa.descricao}</Text> : null}
        {variacaoLabel ? <Text style={s.stepVariacao}>{variacaoLabel}</Text> : null}
      </View>
    </View>
  )
}

function WizardCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={s.wizardCard}>
      <View style={s.wizardCardTitleRow}>
        <Ionicons name={icon} size={18} color={colors.navy800} />
        <Text style={s.wizardCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function WizardField({
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
    <View style={s.wizardField}>
      <Text style={s.wizardLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[s.wizardInput, multiline && s.wizardTextarea]}
      />
    </View>
  )
}

function FilePill({
  file,
  onRemove,
}: {
  file: DocumentPicker.DocumentPickerAsset
  onRemove: () => void
}) {
  return (
    <View style={s.filePill}>
      <Ionicons name={file.mimeType?.startsWith('image/') ? 'image-outline' : 'document-outline'} size={14} color={colors.navy800} />
      <Text style={s.filePillText} numberOfLines={1}>{file.name ?? 'Arquivo selecionado'}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={14} color={colors.ink500} />
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  scroll: { flex: 1, backgroundColor: colors.ink50 },
  content: { paddingBottom: 112 },
  hero: { height: 330, backgroundColor: colors.navy800, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 23, 61, 0.34)' },
  heroTop: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    marginTop: 104,
    marginRight: 'auto',
    marginLeft: -52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(11,16,32,0.35)',
  },
  heroBadgeTxt: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  heroFallback: { flex: 1, backgroundColor: colors.navy800, position: 'relative', overflow: 'hidden' },
  heroKanji: {
    position: 'absolute',
    right: 28,
    top: 34,
    fontFamily: 'serif',
    fontSize: 86,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.08)',
  },
  sun: { position: 'absolute', right: 70, top: 92, width: 74, height: 74, borderRadius: 37, backgroundColor: '#F4B72E' },
  mountainBack: {
    position: 'absolute',
    right: -10,
    bottom: 74,
    width: 250,
    height: 128,
    backgroundColor: 'rgba(89,119,205,0.55)',
    transform: [{ rotate: '45deg' }],
  },
  mountainFront: {
    position: 'absolute',
    left: 34,
    bottom: -38,
    width: 292,
    height: 216,
    backgroundColor: '#152A64',
    transform: [{ rotate: '45deg' }],
  },
  road: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -80,
    width: 122,
    height: 248,
    backgroundColor: '#101F4D',
    transform: [{ perspective: 300 }, { rotateX: '58deg' }],
  },
  roadLine: { position: 'absolute', bottom: 62, alignSelf: 'center', width: 5, height: 142, backgroundColor: '#FBBF24' },
  panel: {
    marginTop: -42,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '800', lineHeight: 38, color: colors.ink900, letterSpacing: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaTxt: { fontSize: 13.5, color: colors.ink500, fontWeight: '600' },
  section: { marginTop: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 1.4 },
  description: { marginTop: 14, fontSize: 17, lineHeight: 28, color: colors.ink700 },
  variationsRow: { gap: 12, paddingRight: 20 },
  variationCard: {
    width: 210,
    minHeight: 136,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
  },
  variationCardActive: { backgroundColor: colors.navy800, borderColor: colors.navy800 },
  variationTop: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  variationName: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 20, color: colors.ink900 },
  variationNameActive: { color: colors.white },
  variationPrice: { marginTop: 14, fontSize: 15, fontWeight: '800', color: colors.navy800 },
  variationPriceActive: { color: colors.white },
  variationMeta: { marginTop: 6, fontSize: 12.5, color: colors.ink500 },
  variationMetaActive: { color: 'rgba(255,255,255,0.72)' },
  selectedSummary: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: colors.navy50,
    borderWidth: 1,
    borderColor: colors.navy100,
    padding: 14,
  },
  selectedSummaryLabel: { fontSize: 10.5, fontWeight: '900', color: colors.navy800, textTransform: 'uppercase', letterSpacing: 0.8 },
  selectedSummaryTitle: { marginTop: 5, fontSize: 16, fontWeight: '900', color: colors.ink900, lineHeight: 21 },
  selectedSummaryDesc: { marginTop: 6, fontSize: 12.5, lineHeight: 18, color: colors.ink600 },
  plainBox: { borderRadius: 18, backgroundColor: colors.ink50, padding: 16, borderWidth: 1, borderColor: colors.ink100 },
  plainTitle: { fontSize: 15, fontWeight: '800', color: colors.ink900 },
  plainTxt: { marginTop: 5, fontSize: 13, lineHeight: 19, color: colors.ink500 },
  timeline: { gap: 0 },
  stepRow: { flexDirection: 'row', gap: 13 },
  stepRail: { width: 28, alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8F8EE', alignItems: 'center', justifyContent: 'center' },
  stepDotTxt: { fontSize: 12, fontWeight: '800', color: colors.ok },
  stepLine: { flex: 1, width: 2, minHeight: 54, backgroundColor: colors.ink100 },
  stepBody: { flex: 1, paddingBottom: 22 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink900, lineHeight: 22 },
  responsavelPill: { borderRadius: 999, backgroundColor: colors.navy50, paddingHorizontal: 9, paddingVertical: 4 },
  responsavelTxt: { fontSize: 10.5, fontWeight: '800', color: colors.navy800 },
  stepDesc: { marginTop: 6, fontSize: 13.5, lineHeight: 20, color: colors.ink500 },
  stepVariacao: { marginTop: 7, fontSize: 12, fontWeight: '700', color: colors.ink400 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  bottomLabel: { fontSize: 12, color: colors.ink500, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  bottomPrice: { marginTop: 2, fontSize: 20, color: colors.ink900, fontWeight: '900' },
  bottomBtn: {
    minWidth: 184,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  bottomBtnTxt: { color: colors.white, fontSize: 16, fontWeight: '800' },
  wizardSafe: { flex: 1, backgroundColor: colors.ink50 },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  wizardClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.ink50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardTitle: { color: colors.ink900, fontSize: 18, fontWeight: '900' },
  wizardSubtitle: { marginTop: 2, color: colors.ink500, fontSize: 12.5, fontWeight: '700' },
  stepTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  stepTab: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.ink50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  stepTabActive: { backgroundColor: colors.navy800 },
  stepTabDone: { backgroundColor: '#E8F8EE' },
  stepTabText: { color: colors.ink500, fontSize: 10.5, fontWeight: '800' },
  stepTabTextActive: { color: colors.white },
  wizardContent: { padding: 16, paddingBottom: 24 },
  wizardCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 14,
    gap: 12,
  },
  wizardCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  wizardCardTitle: { color: colors.ink900, fontSize: 16, fontWeight: '900' },
  wizardField: { gap: 6 },
  wizardLabel: { color: colors.ink700, fontSize: 12.5, fontWeight: '800' },
  wizardInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink900,
    backgroundColor: colors.white,
    fontSize: 14,
  },
  wizardTextarea: { minHeight: 92, paddingTop: 10, textAlignVertical: 'top' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionChipActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  optionChipText: { color: colors.ink500, fontSize: 12, fontWeight: '800' },
  optionChipTextActive: { color: colors.navy800 },
  toggleRow: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTitle: { color: colors.ink900, fontSize: 14, fontWeight: '900' },
  toggleSub: { marginTop: 2, color: colors.ink500, fontSize: 12.5, lineHeight: 18 },
  emptyDocs: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyDocsTitle: { color: colors.ink800, fontSize: 14, fontWeight: '900' },
  emptyDocsText: { color: colors.ink500, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  freeUploadBox: { gap: 12 },
  addFilesBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addFilesText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    padding: 12,
  },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  docName: { flexShrink: 1, color: colors.ink900, fontSize: 14, fontWeight: '900', lineHeight: 19 },
  docBadge: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10.5,
    fontWeight: '900',
  },
  docBadgeOptional: { backgroundColor: colors.navy50, color: colors.navy800 },
  docDesc: { marginTop: 6, color: colors.ink500, fontSize: 12.5, lineHeight: 18 },
  docFile: { marginTop: 6, color: colors.ink400, fontSize: 12, fontWeight: '700' },
  fileList: { gap: 7, marginTop: 9 },
  filePill: {
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
  },
  filePillText: { flex: 1, minWidth: 0, color: colors.ink700, fontSize: 11.5, fontWeight: '800' },
  docBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
  },
  footerBtn: { flex: 1, minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  footerSecondary: { backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100 },
  footerPrimary: { backgroundColor: colors.navy800 },
  footerDisabled: { opacity: 0.55 },
  footerSecondaryText: { color: colors.ink700, fontSize: 14, fontWeight: '900' },
  footerPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink700 },
  emptyBtn: { borderRadius: 14, backgroundColor: colors.navy800, paddingHorizontal: 18, paddingVertical: 11 },
  emptyBtnTxt: { color: colors.white, fontWeight: '700' },
})
