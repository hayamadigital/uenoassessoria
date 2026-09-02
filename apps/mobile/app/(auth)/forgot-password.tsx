import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { colors } from '@/theme'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  async function handleSend() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Informe um e-mail válido.')
      return
    }

    setError(null)
    setIsSending(true)
    try {
      await sendPasswordResetEmail(auth, normalizedEmail)
      setIsSent(true)
    } catch (requestError) {
      const code = (requestError as { code?: string }).code
      if (code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else if (code === 'auth/network-request-failed') {
        setError('Sem conexão. Verifique sua internet e tente novamente.')
      } else if (code === 'auth/user-not-found') {
        setIsSent(true)
      } else {
        setError('Não foi possível enviar o link. Tente novamente em instantes.')
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar para o login"
            onPress={() => router.back()}
            style={s.backButton}
          >
            <Ionicons name="arrow-back" size={21} color={colors.navy800} />
          </TouchableOpacity>

          <View style={s.heading}>
            <Text style={s.title}>Recuperar senha</Text>
            <Text style={s.subtitle}>
              Informe seu e-mail. Se houver uma conta cadastrada, enviaremos um link para criar uma nova senha.
            </Text>
          </View>

          {isSent ? (
            <View accessibilityRole="alert" style={s.successPanel}>
              <Ionicons name="checkmark-circle" size={28} color={colors.green} />
              <View style={s.successCopy}>
                <Text style={s.successTitle}>Confira seu e-mail</Text>
                <Text style={s.successText}>
                  O link pode levar alguns minutos para chegar. Verifique também a caixa de spam.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.form}>
              <View style={s.field}>
                <Text style={s.label}>E-MAIL</Text>
                <TextInput
                  accessibilityLabel="E-mail"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isSending}
                  keyboardType="email-address"
                  maxLength={254}
                  onChangeText={(value: string) => {
                    setEmail(value)
                    if (error) setError(null)
                  }}
                  onSubmitEditing={() => void handleSend()}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.ink400}
                  returnKeyType="send"
                  style={[s.input, error && s.inputError]}
                  value={email}
                />
                {error ? <Text accessibilityRole="alert" style={s.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: isSending }}
                activeOpacity={0.85}
                disabled={isSending}
                onPress={() => void handleSend()}
                style={[s.primaryButton, isSending && s.disabledButton]}
              >
                {isSending
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={s.primaryButtonText}>Enviar link</Text>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.replace('/(auth)/login')}
            style={s.loginButton}
          >
            <Text style={s.loginButtonText}>Voltar para entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginBottom: 36,
  },
  heading: { gap: 10, marginBottom: 32 },
  title: { color: colors.ink900, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.ink500, fontSize: 16, lineHeight: 24 },
  form: { gap: 24 },
  field: { gap: 8 },
  label: { color: colors.ink700, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    color: colors.ink900,
    fontSize: 16,
  },
  inputError: { borderColor: colors.err },
  errorText: { color: colors.err, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.navy800,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
  successPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    backgroundColor: colors.green50,
    padding: 16,
  },
  successCopy: { flex: 1, gap: 4 },
  successTitle: { color: colors.green800, fontSize: 16, fontWeight: '800' },
  successText: { color: colors.green800, fontSize: 14, lineHeight: 21 },
  loginButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  loginButtonText: { color: colors.navy800, fontSize: 15, fontWeight: '700' },
})
