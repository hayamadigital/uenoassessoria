import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '@/lib/firebase'
import { signUp } from '@ueno/firebase'
import { registerSchema, type RegisterInput } from '@ueno/utils/validators'
import { colors } from '@/theme'

export default function RegisterScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      data_nascimento: '',
      provincia_jp: '',
      cidade_jp: '',
    },
  })

  const onSubmit = async (data: RegisterInput) => {
    let user: Awaited<ReturnType<typeof signUp>> | null = null
    try {
      user = await signUp(auth, data.email, data.password)
      const selfRegister = httpsCallable(functions, 'selfRegister')
      await selfRegister({
        full_name: data.full_name,
        email: data.email,
        data_nascimento: data.data_nascimento,
        provincia_jp: data.provincia_jp,
        cidade_jp: data.cidade_jp,
      })
      // Force token refresh so role claim is picked up by auth handler
      await user.getIdToken(true)
      // auth change handler in _layout.tsx handles redirect
    } catch (e: any) {
      if (user && e?.code !== 'auth/email-already-in-use') {
        try { await user.delete() } catch (_) {}
      }
      const msg = e?.code === 'auth/email-already-in-use'
        ? 'Este e-mail já está cadastrado.'
        : e?.message ?? 'Erro ao criar conta. Tente novamente.'
      Alert.alert('Erro ao criar conta', msg)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.langPill}>
              <Text style={s.langText}>🇧🇷  PT-BR</Text>
            </View>
          </View>

          <Text style={s.title}>Novo acesso</Text>
          <Text style={s.subtitle}>Preencha seus dados para criar sua conta.</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>NOME COMPLETO</Text>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.full_name && s.inputErr]}
                  placeholder="Seu nome completo"
                  placeholderTextColor={colors.ink400}
                  autoCapitalize="words"
                  autoComplete="name"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.full_name && <Text style={s.errTxt}>{errors.full_name.message}</Text>}
          </View>

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
                  autoComplete="new-password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && <Text style={s.errTxt}>{errors.password.message}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>DATA DE NASCIMENTO</Text>
            <Controller
              control={control}
              name="data_nascimento"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.data_nascimento && s.inputErr]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.ink400}
                  keyboardType="numeric"
                  maxLength={10}
                  onBlur={onBlur}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, '')
                    let formatted = digits
                    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2)
                    if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8)
                    onChange(formatted)
                  }}
                  value={value}
                />
              )}
            />
            {errors.data_nascimento && <Text style={s.errTxt}>{errors.data_nascimento.message}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>PROVÍNCIA ATUAL</Text>
            <Controller
              control={control}
              name="provincia_jp"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.provincia_jp && s.inputErr]}
                  placeholder="Ex: Aichi, Tokyo, Shizuoka…"
                  placeholderTextColor={colors.ink400}
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.provincia_jp && <Text style={s.errTxt}>{errors.provincia_jp.message}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>CIDADE ATUAL</Text>
            <Controller
              control={control}
              name="cidade_jp"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[s.input, errors.cidade_jp && s.inputErr]}
                  placeholder="Ex: Nagoya, Toyota…"
                  placeholderTextColor={colors.ink400}
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.cidade_jp && <Text style={s.errTxt}>{errors.cidade_jp.message}</Text>}
          </View>

          <TouchableOpacity
            style={[s.btn, isSubmitting && s.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Criar conta</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.loginWrap} onPress={() => router.back()}>
            <Text style={s.loginTxt}>Já tenho uma conta  <Text style={s.loginLink}>Entrar</Text></Text>
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
  btn: {
    backgroundColor: colors.navy800,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  loginWrap: { alignItems: 'center' },
  loginTxt: { fontSize: 14, color: colors.ink500 },
  loginLink: { color: colors.navy800, fontWeight: '600' },
})
