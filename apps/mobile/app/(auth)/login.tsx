import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '@/lib/firebase'
import { signIn } from '@ueno/firebase'
import { loginSchema, type LoginInput } from '@ueno/utils/validators'
import { colors } from '@/theme'

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      await signIn(auth, data.email, data.password)
      // routing handled by onAuthChange in root _layout.tsx
    } catch (e: any) {
      const code = e?.code as string | undefined
      const msg =
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
          ? 'E-mail ou senha incorretos.'
          : code === 'auth/too-many-requests'
          ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          : code === 'auth/user-disabled'
          ? 'Conta desativada. Contate o administrador.'
          : code === 'auth/network-request-failed'
          ? 'Sem conexão. Verifique sua internet.'
          : 'Erro ao entrar. Tente novamente.'
      Alert.alert('Erro ao entrar', msg)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Back + lang row */}
          <View style={s.topRow}>
            <View style={s.backBtn}>
              <Text style={s.backArrow}>‹</Text>
            </View>
            <View style={s.langPill}>
              <Text style={s.langText}>🇧🇷  PT-BR</Text>
            </View>
          </View>

          <Text style={s.title}>Bem-vindo de volta</Text>
          <Text style={s.subtitle}>Acesse sua conta para acompanhar seus processos.</Text>

          {/* E-mail */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>E-MAIL</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.email && s.inputErr]}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.ink400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && <Text style={s.errTxt}>{errors.email.message}</Text>}
          </View>

          {/* Senha */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>SENHA</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.password && s.inputErr]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.ink400}
                  secureTextEntry
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && <Text style={s.errTxt}>{errors.password.message}</Text>}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/forgot-password')}
            style={s.forgotWrap}
          >
            <Text style={s.forgotTxt}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, isSubmitting && s.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.registerBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={s.registerBtnTxt}>Novo acesso</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.ink50, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: colors.ink700, lineHeight: 24 },
  langPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.ink50 },
  langText: { fontSize: 12, color: colors.ink500, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: colors.ink900, letterSpacing: -0.6, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.ink500, marginBottom: 32, lineHeight: 20 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', color: colors.ink500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: colors.ink50,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.ink900,
    borderWidth: 1,
    borderColor: colors.ink100,
  },
  inputErr: { borderColor: colors.err },
  errTxt: { fontSize: 12, color: colors.err, marginTop: 4 },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 28 },
  forgotTxt: { fontSize: 13, color: colors.navy800, fontWeight: '500' },
  btn: {
    backgroundColor: colors.navy800,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  registerBtn: {
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.navy800,
  },
  registerBtnTxt: { fontSize: 15, fontWeight: '600', color: colors.navy800, letterSpacing: -0.2 },
})
