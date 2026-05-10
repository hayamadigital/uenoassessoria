import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { auth, db } from '@/lib/firebase'
import { signOut } from '@ueno/firebase'
import { getClienteByProfileId } from '@ueno/firebase/queries/clientes'
import { listProcessosByCliente } from '@ueno/firebase/queries/processos'
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

export default function PerfilScreen() {
  const { session, clear } = useAuthStore()

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

  const ativos = processos?.filter((p) => p.status === 'ativo').length ?? 0
  const totalSimulados = 0 // TODO: aggregate from simulado_resultados

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

  return (
    <SafeAreaView style={s.safe}>
      {/* Header azul */}
      <View style={s.header}>
        <View style={s.headerCircle} />
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Meu perfil</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="settings-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.avatarRow}>
          <View style={{ position: 'relative' }}>
            <Avatar name={session?.fullName ?? 'Cliente'} size={64} url={session?.avatarUrl} />
            <View style={s.avatarEditBtn}>
              <Ionicons name="add" size={12} color={colors.navy800} />
            </View>
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
          <Row icon="person-outline" label="Informações cadastrais" onPress={() => {}} />
          <Row icon="document-text-outline" label="Documentos" onPress={() => {}} />
          <Row icon="location-outline" label="Endereço no Japão" value={cliente?.cidade_jp ?? '—'} onPress={() => {}} last />
        </Section>

        <Section title="Preferências">
          <Row icon="globe-outline" label="Idioma" value={session?.preferredLang === 'pt-BR' ? 'Português (BR)' : 'English'} onPress={() => {}} />
          <Row icon="notifications-outline" label="Notificações" onPress={() => {}} />
          <Row icon="lock-closed-outline" label="Privacidade e segurança" onPress={() => {}} last />
        </Section>

        <Section title="Sobre">
          <Row icon="star-outline" label="Indique e ganhe ¥ 5.000" color={colors.amber} onPress={() => {}} />
          <Row icon="chatbubble-outline" label="Falar com a equipe" onPress={() => {}} />
          <Row icon="log-out-outline" label="Sair" color={colors.red} onPress={handleLogout} right={<View />} last />
        </Section>
      </ScrollView>
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
