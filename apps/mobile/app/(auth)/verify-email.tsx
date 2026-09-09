import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { reloadAuthUser, sendVerificationEmail, signOut } from '@ueno/firebase'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { colors, shadows } from '@/theme'

const RESEND_COOLDOWN_SECONDS = 30

function verificationErrorMessage(code?: string) {
  if (code === 'auth/too-many-requests') {
    return 'Muitas tentativas de envio. Aguarde alguns minutos e tente novamente.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Sem conexão. Verifique sua internet e tente novamente.'
  }
  return 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.'
}

export default function VerifyEmailScreen() {
  const clear = useAuthStore((state) => state.clear)
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const email = auth.currentUser?.email ?? ''

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const checkVerification = useCallback(async (showNotVerifiedMessage: boolean) => {
    const user = auth.currentUser
    if (!user) {
      clear()
      router.replace('/(auth)/login')
      return
    }

    setChecking(true)
    try {
      await reloadAuthUser(user)
      if (!user.emailVerified) {
        if (showNotVerifiedMessage) {
          Alert.alert(
            'E-mail ainda não confirmado',
            'Abra a mensagem enviada pelo Firebase, toque no link de confirmação e volte ao aplicativo.',
          )
        }
        return
      }

      // Causes the root token listener to rebuild the authenticated session.
      await user.getIdToken(true)
    } catch (error: any) {
      if (showNotVerifiedMessage) {
        Alert.alert('Não foi possível verificar', verificationErrorMessage(error?.code))
      }
    } finally {
      setChecking(false)
    }
  }, [clear])

  useEffect(() => {
    void checkVerification(false)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkVerification(false)
    })
    return () => subscription.remove()
  }, [checkVerification])

  const resend = async () => {
    const user = auth.currentUser
    if (!user || sending || cooldown > 0) return

    setSending(true)
    try {
      await sendVerificationEmail(auth, user)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      Alert.alert('E-mail enviado', `Enviamos uma nova mensagem para ${user.email ?? 'seu endereço'}.`)
    } catch (error: any) {
      Alert.alert('Erro ao reenviar', verificationErrorMessage(error?.code))
    } finally {
      setSending(false)
    }
  }

  const changeAccount = async () => {
    await signOut(auth)
    clear()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.iconWrap}>
          <Ionicons name="mail-unread-outline" size={42} color={colors.navy800} />
        </View>

        <Text style={s.title}>Confirme seu e-mail</Text>
        <Text style={s.description}>
          Enviamos um link de confirmação para
        </Text>
        <Text style={s.email}>{email}</Text>
        <Text style={s.help}>
          Abra a mensagem, confirme seu endereço e depois volte para continuar. Confira também a pasta de spam.
        </Text>

        <TouchableOpacity
          style={[s.primaryButton, checking && s.disabled]}
          onPress={() => void checkVerification(true)}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel="Já confirmei meu e-mail"
          activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color={colors.white} />
            : <Text style={s.primaryButtonText}>Já confirmei</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondaryButton, (sending || cooldown > 0) && s.disabled]}
          onPress={() => void resend()}
          disabled={sending || cooldown > 0}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color={colors.navy800} />
          ) : (
            <Text style={s.secondaryButtonText}>
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar e-mail'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.changeAccountButton}
          onPress={() => void changeAccount()}
          accessibilityRole="button"
        >
          <Text style={s.changeAccountText}>Entrar com outra conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy100,
    marginBottom: 28,
    ...shadows.sm,
  },
  title: {
    color: colors.ink900,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: { color: colors.ink500, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  email: {
    color: colors.navy800,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
  help: {
    color: colors.ink500,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 32,
    maxWidth: 340,
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { color: colors.navy800, fontSize: 15, fontWeight: '700' },
  changeAccountButton: { paddingVertical: 16, paddingHorizontal: 12, marginTop: 8 },
  changeAccountText: { color: colors.ink500, fontSize: 14, fontWeight: '500' },
  disabled: { opacity: 0.6 },
})
