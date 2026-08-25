import { useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db, storage } from '@/lib/firebase'
import { colors } from '@/theme'
import { useAuthStore } from '@/stores/auth.store'
import { ProfileHeader } from '@/components/ProfileHeader'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { getClienteDocumentos, getDocumentoSignedUrl } from '@ueno/firebase/queries/documentos'
import type { ClienteDocumentoWithTemplate, StatusDocumento } from '@ueno/firebase'

const STATUS_META: Record<StatusDocumento, { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pendente: { label: 'Pendente', bg: '#FEF3C7', fg: '#92400E', icon: 'time-outline' },
  enviado: { label: 'Enviado', bg: '#DBEAFE', fg: '#1D4ED8', icon: 'cloud-done-outline' },
  aprovado: { label: 'Aprovado', bg: '#DCFCE7', fg: '#15803D', icon: 'checkmark-circle-outline' },
  reprovado: { label: 'Reprovado', bg: '#FEE2E2', fg: '#B91C1C', icon: 'close-circle-outline' },
  expirado: { label: 'Expirado', bg: '#F1F5F9', fg: '#475569', icon: 'alert-circle-outline' },
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Data não informada'
  try {
    return format(new Date(value), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  } catch {
    return 'Data não informada'
  }
}

function formatFileSize(size: number | null | undefined) {
  if (!size) return null
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function openDocumento(documento: ClienteDocumentoWithTemplate) {
  if (!documento.arquivo_url) {
    Alert.alert('Arquivo indisponível', 'Este documento ainda não possui arquivo enviado.')
    return
  }

  try {
    const url = documento.arquivo_url.startsWith('http')
      ? documento.arquivo_url
      : await getDocumentoSignedUrl(storage, documento.arquivo_url)
    await Linking.openURL(url)
  } catch {
    Alert.alert('Não foi possível abrir', 'Tente novamente em alguns instantes.')
  }
}

function DocumentoCard({ documento }: { documento: ClienteDocumentoWithTemplate }) {
  const status = STATUS_META[documento.status]
  const title = documento.template?.nome ?? documento.nome_custom ?? documento.arquivo_nome ?? 'Documento'
  const fileSize = formatFileSize(documento.arquivo_tamanho)

  return (
    <TouchableOpacity
      style={s.docCard}
      onPress={() => openDocumento(documento)}
      activeOpacity={documento.arquivo_url ? 0.82 : 1}
    >
      <View style={s.docIconWrap}>
        <Ionicons name="document-text-outline" size={22} color={colors.navy800} />
      </View>
      <View style={s.docBody}>
        <View style={s.docTop}>
          <Text style={s.docTitle} numberOfLines={2}>{title}</Text>
          <View style={[s.statusPill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.fg} />
            <Text style={[s.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>

        {documento.template?.descricao ? (
          <Text style={s.docDesc} numberOfLines={2}>{documento.template.descricao}</Text>
        ) : null}

        <View style={s.metaRow}>
          <Text style={s.metaText}>{formatDate(documento.created_at)}</Text>
          {documento.arquivo_nome ? <Text style={s.metaDot}>•</Text> : null}
          {documento.arquivo_nome ? <Text style={s.metaText} numberOfLines={1}>{documento.arquivo_nome}</Text> : null}
          {fileSize ? <Text style={s.metaDot}>•</Text> : null}
          {fileSize ? <Text style={s.metaText}>{fileSize}</Text> : null}
        </View>

        {documento.observacao ? <Text style={s.observacao} numberOfLines={2}>{documento.observacao}</Text> : null}
      </View>
      <Ionicons name={documento.arquivo_url ? 'open-outline' : 'lock-closed-outline'} size={18} color={colors.ink300} />
    </TouchableOpacity>
  )
}

export default function DocumentosScreen() {
  const { session } = useAuthStore()

  const { data: cliente, isLoading: loadingCliente, refetch: refetchCliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const {
    data: documentos = [],
    isLoading: loadingDocumentos,
    refetch: refetchDocumentos,
  } = useQuery({
    queryKey: ['cliente', cliente?.id, 'documentos'],
    queryFn: () => getClienteDocumentos(db, cliente!.id),
    enabled: !!cliente,
  })

  const enviados = useMemo(
    () => documentos
      .filter((documento) => !!documento.arquivo_url)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documentos],
  )

  const aprovados = enviados.filter((documento) => documento.status === 'aprovado').length
  const emAnalise = enviados.filter((documento) => documento.status === 'enviado' || documento.status === 'pendente').length

  const loading = loadingCliente || loadingDocumentos

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Documentos" subtitle="Meu perfil" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.refreshBtn} onPress={() => { refetchCliente(); refetchDocumentos() }}>
          <Ionicons name="refresh-outline" size={15} color={colors.navy800} />
          <Text style={s.refreshText}>Atualizar lista</Text>
        </TouchableOpacity>

        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryNumber}>{enviados.length}</Text>
            <Text style={s.summaryLabel}>Enviados</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryNumber}>{emAnalise}</Text>
            <Text style={s.summaryLabel}>Em análise</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryNumber}>{aprovados}</Text>
            <Text style={s.summaryLabel}>Aprovados</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.navy800} />
            <Text style={s.loadingText}>Carregando documentos...</Text>
          </View>
        ) : enviados.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="cloud-upload-outline" size={28} color={colors.ink400} />
            </View>
            <Text style={s.emptyTitle}>Nenhum documento enviado</Text>
            <Text style={s.emptyText}>
              Quando você contratar um serviço e enviar documentos para análise, eles aparecerão aqui.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            <Text style={s.sectionLabel}>HISTÓRICO</Text>
            {enviados.map((documento) => (
              <DocumentoCard key={documento.id} documento={documento} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  refreshBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.navy50,
    borderWidth: 1,
    borderColor: colors.navy100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  refreshText: { color: colors.navy800, fontSize: 12, fontWeight: '900' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    paddingVertical: 16,
    marginBottom: 22,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryNumber: { color: colors.ink900, fontSize: 22, fontWeight: '900' },
  summaryLabel: { color: colors.ink500, fontSize: 11.5, fontWeight: '800' },
  summaryDivider: { width: 1, height: 34, backgroundColor: colors.ink100 },
  loadingBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: colors.ink500, fontSize: 13, fontWeight: '700' },
  emptyCard: {
    minHeight: 260,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.ink50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: colors.ink900, fontSize: 16, fontWeight: '900' },
  emptyText: { color: colors.ink500, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  list: { gap: 10 },
  sectionLabel: { color: colors.ink500, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 14,
  },
  docIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.navy50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBody: { flex: 1, minWidth: 0 },
  docTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  docTitle: { flex: 1, color: colors.ink900, fontSize: 14.5, fontWeight: '900', lineHeight: 20 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '900' },
  docDesc: { color: colors.ink500, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  metaText: { color: colors.ink400, fontSize: 11.5, fontWeight: '700', maxWidth: 170 },
  metaDot: { color: colors.ink300, fontSize: 11 },
  observacao: { color: colors.navy800, fontSize: 11.5, lineHeight: 17, fontWeight: '700', marginTop: 7 },
})
