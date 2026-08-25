import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { colors, shadows } from '@/theme'
import { useAuthStore } from '@/stores/auth.store'

type EditableRole = 'admin' | 'instrutor'

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'url'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink400}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoLine}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

export default function AdminInviteUserScreen() {
  const { session } = useAuthStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<EditableRole>('instrutor')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome completo e email para gerar o convite.')
      return
    }

    try {
      setLoading(true)
      const inviteUser = httpsCallable<
        { email: string; full_name: string; role: EditableRole },
        { user_id: string; reset_link?: string }
      >(getFunctions(), 'inviteUser')

      const { data } = await inviteUser({
        email: email.trim(),
        full_name: fullName.trim(),
        role,
      })

      setInviteLink(data.reset_link ?? null)
      Alert.alert('Convite gerado', 'O link de acesso foi criado e está visível abaixo.')
    } catch (error) {
      Alert.alert('Falha ao gerar convite', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const openInviteLink = async () => {
    if (!inviteLink) return
    try {
      await Linking.openURL(inviteLink)
    } catch {
      Alert.alert('Não foi possível abrir o link', inviteLink)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.ink900} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Convidar usuário</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.title}>Novo acesso</Text>
            <Text style={s.subtitle}>
              Crie o acesso manualmente e compartilhe o link com a pessoa convidada.
            </Text>

            <Field
              label="Nome completo"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nome da pessoa"
              autoCapitalize="words"
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.sectionLabel}>Permissão</Text>
            <View style={s.segment}>
              {[
                ['instrutor', 'Instrutor'],
                ['admin', 'Admin'],
              ].map(([value, label]) => {
                const selected = role === value
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.segmentItem, selected && s.segmentItemActive]}
                    activeOpacity={0.8}
                    onPress={() => setRole(value as EditableRole)}
                  >
                    <Text style={[s.segmentText, selected && s.segmentTextActive]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={handleInvite} disabled={loading}>
              <Text style={s.primaryBtnText}>{loading ? 'Gerando...' : 'Gerar convite'}</Text>
            </TouchableOpacity>
          </View>

          {inviteLink ? (
            <View style={s.linkCard}>
              <Text style={s.linkTitle}>Link de acesso criado</Text>
              <InfoLine label="Email" value={session?.email ?? '-'} />
              <Text style={s.linkValue} selectable>
                {inviteLink}
              </Text>
              <View style={s.linkActions}>
                <TouchableOpacity style={s.linkBtn} onPress={openInviteLink} activeOpacity={0.8}>
                  <Ionicons name="open-outline" size={16} color={colors.navy800} />
                  <Text style={s.linkBtnText}>Abrir link</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.linkBtn} onPress={() => setInviteLink(null)} activeOpacity={0.8}>
                  <Ionicons name="close-outline" size={16} color={colors.ink700} />
                  <Text style={s.linkBtnText}>Ocultar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.ink50,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
  },
  headerSpacer: { width: 38, height: 38 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink900 },
  content: { padding: 20, paddingTop: 10, paddingBottom: 34 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 16,
    ...shadows.sm,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink900 },
  subtitle: { fontSize: 13, color: colors.ink500, lineHeight: 19, marginTop: 4, marginBottom: 14 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.ink700, marginBottom: 6 },
  fieldInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.ink900,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  segment: { gap: 10, marginBottom: 14 },
  segmentItem: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink50,
  },
  segmentItemActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.ink500 },
  segmentTextActive: { color: colors.navy800 },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: colors.white },
  linkCard: {
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.navy100,
    padding: 16,
    ...shadows.sm,
  },
  linkTitle: { fontSize: 15, fontWeight: '800', color: colors.navy900, marginBottom: 12 },
  infoLine: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
    marginBottom: 10,
  },
  infoLabel: { fontSize: 11, fontWeight: '800', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13.5, fontWeight: '700', color: colors.ink900, marginTop: 4 },
  linkValue: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.white,
    color: colors.ink800,
    fontSize: 12,
    lineHeight: 17,
  },
  linkActions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  linkBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkBtnText: { fontSize: 12.5, fontWeight: '800', color: colors.ink800 },
})
