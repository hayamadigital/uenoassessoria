import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { auth, db } from '@/lib/firebase'
import { signOut } from '@ueno/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
import { listClienteSimuladoResultados } from '@ueno/firebase/queries/materiais'
import { getPublicAppConfig } from '@ueno/firebase/queries/public-config'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors } from '@/theme'

type RowProps = { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void; color?: string; last?: boolean; right?: React.ReactNode }

function Row({ icon, label, value, onPress, color = colors.ink700, last, right }: RowProps) {
  return (
    <TouchableOpacity
      style={[r.row, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[r.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={r.label}>{label}</Text>
      {value ? <Text style={r.value}>{value}</Text> : null}
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.ink300} />}
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={r.section}>
      <Text style={r.sectionLabel}>{title.toUpperCase()}</Text>
      <View style={r.sectionCard}>{children}</View>
    </View>
  )
}

function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  const text = message.trim()
  if (!digits || !text) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export default function PerfilScreen() {
  const { session, clear } = useAuthStore()
  const [contactOpen, setContactOpen] = useState(false)
  const [contactMessage, setContactMessage] = useState('')

  const { data: cliente } = useQuery({
    queryKey: ['cliente', 'me', session?.userId],
    queryFn: () => getClienteByProfileId(db, session!.userId),
    enabled: !!session,
  })

  const { data: processos } = useQuery({
    queryKey: ['processos', cliente?.id],
    queryFn: () => listProcessosByCliente(db, cliente!.id),
    enabled: !!cliente,
  })

  const { data: simuladoResultados } = useQuery({
    queryKey: ['cliente-simulado-resultados', session?.userId],
    queryFn: () => listClienteSimuladoResultados(db, session!.userId),
    enabled: !!session?.userId,
  })

  const { data: publicConfig } = useQuery({
    queryKey: ['public-app-config'],
    queryFn: () => getPublicAppConfig(db),
  })

  const ativos = processos?.filter((p) => p.status === 'ativo' || p.status === 'analise').length ?? 0
  const totalSimulados = simuladoResultados?.length ?? 0

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja mesmo sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await signOut(auth)
          clear()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  useEffect(() => {
    if (!session || contactMessage.trim()) return
    setContactMessage(`Olá, equipe Ueno! Meu nome é ${session.fullName ?? 'cliente'} e gostaria de tirar dúvidas.`)
  }, [contactMessage, session])

  const openContactModal = () => {
    if (!publicConfig?.support_whatsapp) {
      Alert.alert('WhatsApp não configurado', 'Configure o número de suporte no app web para habilitar este atendimento.')
      return
    }
    setContactOpen(true)
  }

  const sendWhatsAppMessage = async () => {
    const url = buildWhatsAppUrl(publicConfig?.support_whatsapp, contactMessage)
    if (!url) {
      Alert.alert('Mensagem obrigatória', 'Escreva a mensagem que deseja enviar para a equipe.')
      return
    }
    setContactOpen(false)
    await Linking.openURL(url)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header azul */}
      <View style={s.header}>
        <View style={s.headerCircle} />
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Meu perfil</Text>
          <TouchableOpacity onPress={() => router.push('/perfil/preferencias' as any)}>
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.avatarRow}>
          <View style={{ position: 'relative' }}>
            <Avatar name={session?.fullName ?? 'Cliente'} size={64} url={session?.avatarUrl} />
            <TouchableOpacity style={s.avatarEditBtn} onPress={() => router.push('/perfil/dados-pessoais' as any)}>
              <Ionicons name="add" size={12} color={colors.navy800} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.name}>{session?.fullName ?? '—'}</Text>
            <Text style={s.email}>{session?.email ?? '—'}</Text>
            <View style={s.premiumPill}>
              <Ionicons name="shield-checkmark" size={10} color="white" />
              <Text style={s.premiumTxt}> Cliente</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsCard}>
          {[
            [String(ativos), 'Processo ativo'],
            [String(totalSimulados), 'Simulados'],
            [cliente?.cidade_jp ?? '—', 'Cidade'],
          ].map(([n, l], i) => (
            <View key={l} style={[s.statItem, i < 2 && s.statDivider]}>
              <Text style={s.statN}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Section title="Dados pessoais">
          <Row icon="person-outline" label="Informações cadastrais" onPress={() => router.push('/perfil/dados-pessoais' as any)} />
          <Row icon="document-text-outline" label="Documentos" onPress={() => router.push('/documentos' as any)} />
          <Row icon="call-outline" label="Contatos" value={cliente?.profile?.phone ?? '—'} onPress={() => router.push('/perfil/contatos' as any)} />
          <Row icon="location-outline" label="Endereço no Japão" value={cliente?.cidade_jp ?? '—'} onPress={() => router.push('/perfil/endereco' as any)} last />
        </Section>

        <Section title="Preferências">
          <Row icon="globe-outline" label="Idioma" value={session?.preferredLang === 'pt-BR' ? 'Português (BR)' : 'English'} onPress={() => router.push('/perfil/preferencias' as any)} />
          <Row icon="notifications-outline" label="Notificações" onPress={() => router.push('/perfil/notificacoes' as any)} />
          <Row icon="lock-closed-outline" label="Privacidade e segurança" onPress={() => router.push('/perfil/alterar-senha' as any)} last />
        </Section>

        <Section title="Sobre">
          <Row icon="chatbubble-outline" label="Falar com a equipe" onPress={openContactModal} />
          <Row icon="log-out-outline" label="Sair" color={colors.red} onPress={handleLogout} right={<View />} last />
        </Section>
      </ScrollView>

      <Modal visible={contactOpen} animationType="fade" transparent onRequestClose={() => setContactOpen(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalIcon}>
                <Ionicons name="logo-whatsapp" size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Falar com a equipe</Text>
                <Text style={s.modalSub}>A mensagem será aberta no WhatsApp.</Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setContactOpen(false)}>
                <Ionicons name="close" size={18} color={colors.ink600} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Mensagem</Text>
            <TextInput
              value={contactMessage}
              onChangeText={setContactMessage}
              placeholder="Digite sua mensagem..."
              placeholderTextColor={colors.ink300}
              multiline
              textAlignVertical="top"
              style={s.messageInput}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setContactOpen(false)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sendBtn} onPress={sendWhatsAppMessage}>
                <Text style={s.sendText}>Enviar no WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    backgroundColor: colors.navy800, paddingBottom: 20, overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', right: -80, top: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,.04)' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, marginBottom: 18 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: 'white' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  avatarEditBtn: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.navy800 },
  name: { fontSize: 18, fontWeight: '700', color: 'white', letterSpacing: -0.4 },
  email: { fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 },
  premiumPill: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.16)', alignSelf: 'flex-start' },
  premiumTxt: { fontSize: 11, color: 'white', fontWeight: '600' },
  statsCard: {
    marginHorizontal: 20, backgroundColor: 'white', borderRadius: 18, padding: 14,
    flexDirection: 'row',
    shadowColor: colors.navy900, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { borderRightWidth: 1, borderRightColor: colors.ink100 },
  statN: { fontSize: 18, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3 },
  statL: { fontSize: 10.5, color: colors.ink500, marginTop: 1 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,16,32,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { color: colors.ink900, fontSize: 16, fontWeight: '900' },
  modalSub: { color: colors.ink500, fontSize: 12.5, marginTop: 2 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.ink50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: { color: colors.ink700, fontSize: 12.5, fontWeight: '800', marginBottom: 7 },
  messageInput: {
    minHeight: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingTop: 12,
    color: colors.ink900,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.ink700, fontSize: 13, fontWeight: '900' },
  sendBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontSize: 13, fontWeight: '900' },
})

const r = StyleSheet.create({
  section: { marginBottom: 22 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.ink500, letterSpacing: 0.8, marginBottom: 10 },
  sectionCard: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.ink100, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { flex: 1, fontSize: 13.5, fontWeight: '500', color: colors.ink900 },
  value: { fontSize: 13, color: colors.ink500 },
})
