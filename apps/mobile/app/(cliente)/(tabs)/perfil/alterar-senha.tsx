import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { Ionicons } from '@expo/vector-icons'
import { auth } from '@/lib/firebase'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink300}
        secureTextEntry
        autoCapitalize="none"
        style={s.input}
      />
    </View>
  )
}

export default function AlterarSenhaScreen() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const user = auth.currentUser
    if (!user?.email) {
      Alert.alert('Sessao indisponivel', 'Entre novamente e tente alterar a senha.')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Senha muito curta', 'A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Senhas diferentes', 'Confirme a nova senha corretamente.')
      return
    }

    setSaving(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Senha atualizada', 'Sua senha foi alterada com sucesso.')
    } catch {
      Alert.alert('Nao foi possivel alterar', 'Confira sua senha atual e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Alterar senha" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.navy800} />
              <Text style={s.cardTitle}>Privacidade e seguranca</Text>
            </View>
            <Text style={s.description}>Para proteger sua conta, confirme a senha atual antes de criar uma nova.</Text>
            <Field label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} />
            <Field label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Minimo de 8 caracteres" />
            <Field label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} />
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            <Text style={s.saveText}>{saving ? 'Salvando...' : 'Alterar senha'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  description: { color: colors.ink500, fontSize: 13, lineHeight: 19 },
  field: { gap: 6 },
  label: { color: colors.ink700, fontWeight: '700', fontSize: 12.5 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.ink200, borderRadius: 10, paddingHorizontal: 12, color: colors.ink900, backgroundColor: colors.white, fontSize: 14 },
  saveBtn: { minHeight: 50, borderRadius: 12, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '800' },
})
