import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Linking,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, functions, db } from '@/lib/firebase'
import { getPublicAppConfig } from '@ueno/firebase/queries/public-config'
import { registerSchema, type RegisterInput } from '@ueno/utils/validators'
import {
  INTERESSE_CATEGORIA_OPTIONS,
  INTERESSE_CATEGORIA_LABEL,
  subopcoesDisponiveis,
  COMO_CONHECEU_OPTIONS,
  COMO_CONHECEU_LABEL,
  buildInteresseResumo,
  labelComoConheceu,
  friendlyRegisterErrorMessage,
} from '@ueno/utils/cadastro-evento'
import { CityAutocomplete } from '@/components/CityAutocomplete'
import { colors } from '@/theme'

function buildWhatsAppUrls(phone: string | null, message: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const encoded = encodeURIComponent(message)
  return {
    app: `whatsapp://send?phone=${digits}&text=${encoded}`,
    web: `https://wa.me/${digits}?text=${encoded}`,
  }
}

function buildLeadMessage(data: RegisterInput) {
  return [
    'Olá, visitei a UENO ASSESSORIA no evento e gostaria de receber mais informações.',
    '',
    `Nome: ${data.full_name}`,
    `Data de nascimento: ${data.data_nascimento}`,
    `Cidade: ${data.cidade_jp}${data.provincia_jp ? `, ${data.provincia_jp}` : ''}`,
    `Interesse: ${buildInteresseResumo(data.interesse_categorias, data.interesse_subopcoes)}`,
    `Conheceu a UENO através de: ${labelComoConheceu(data.como_conheceu)}`,
  ].join('\n')
}

export default function RegisterScreen() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { data: publicConfig } = useQuery({
    queryKey: ['public-app-config'],
    queryFn: () => getPublicAppConfig(db),
  })

  const {
    control, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      data_nascimento: '',
      provincia_jp: '',
      cidade_jp: '',
      interesse_categorias: [],
      interesse_subopcoes: [],
    },
  })

  const cidadeJp = watch('cidade_jp')
  const interesseCategorias = watch('interesse_categorias')
  const interesseSubopcoes = watch('interesse_subopcoes')
  const comoConheceu = watch('como_conheceu')

  function toggleCategoria(value: (typeof INTERESSE_CATEGORIA_OPTIONS)[number]) {
    const selecionadas = interesseCategorias.includes(value)
      ? interesseCategorias.filter((c) => c !== value)
      : [...interesseCategorias, value]
    setValue('interesse_categorias', selecionadas, { shouldValidate: true })

    // Remove sub-opções que só existiam por causa da categoria removida.
    const validas = new Set(subopcoesDisponiveis(selecionadas).map((o) => o.value))
    setValue('interesse_subopcoes', interesseSubopcoes.filter((s) => validas.has(s)), { shouldValidate: true })
  }

  function toggleSubopcao(value: string) {
    const selecionadas = interesseSubopcoes.includes(value)
      ? interesseSubopcoes.filter((s) => s !== value)
      : [...interesseSubopcoes, value]
    setValue('interesse_subopcoes', selecionadas, { shouldValidate: true })
  }

  const openWhatsAppWithLead = async (data: RegisterInput) => {
    const urls = buildWhatsAppUrls(publicConfig?.support_whatsapp ?? null, buildLeadMessage(data))
    if (!urls) {
      Alert.alert(
        'Conta criada',
        'Não encontramos o WhatsApp da UENO configurado agora. Fale direto com a equipe no estande.',
      )
      return
    }
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(urls.web)
        return
      }
      try {
        await Linking.openURL(urls.app)
      } catch {
        await Linking.openURL(urls.web)
      }
    } catch {
      Alert.alert(
        'Conta criada',
        'Não conseguimos abrir o WhatsApp automaticamente. Procure a equipe da UENO no estande.',
      )
    }
  }

  const onSubmit = async (data: RegisterInput) => {
    try {
      const selfRegister = httpsCallable(functions, 'selfRegister')
      await selfRegister({
        full_name: data.full_name,
        email: data.email,
        data_nascimento: data.data_nascimento,
        provincia_jp: data.provincia_jp,
        cidade_jp: data.cidade_jp,
        interesse_categorias: data.interesse_categorias,
        interesse_subopcoes: data.interesse_subopcoes,
        como_conheceu: data.como_conheceu,
        canal_cadastro: 'mobile_app',
      })

      // Sem senha nesta tela: a conta é criada no servidor e o e-mail abaixo é
      // quem deixa o visitante definir a própria senha (e confirma o e-mail de
      // quebra). Não bloqueia o fluxo — segue direto pro WhatsApp.
      auth.languageCode = 'pt-BR'
      sendPasswordResetEmail(auth, data.email).catch((emailError) => {
        console.warn('[Auth] password setup email was not sent:', emailError)
      })

      await openWhatsAppWithLead(data)

      // A tela fica montada por baixo do WhatsApp — quando o visitante voltar
      // pro app, já encontra o aviso pra confirmar o e-mail em vez do formulário.
      setSubmittedEmail(data.email)
      setSubmitted(true)
    } catch (e: any) {
      Alert.alert('Erro ao criar conta', friendlyRegisterErrorMessage(e?.code))
    }
  }

  function handleNewRegistration() {
    reset()
    setSubmitted(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(auth)/onboarding')}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.langPill}>
              <Text style={s.langText}>🇧🇷  PT-BR</Text>
            </View>
          </View>

          {submitted ? (
            <View>
              <Text style={s.title}>Cadastro enviado!</Text>
              <Text style={s.subtitle}>
                Enviamos um e-mail para <Text style={s.confirmEmail}>{submittedEmail}</Text>. Abra ele
                para definir sua senha — assim que confirmar, você já pode entrar no app.
              </Text>

              <TouchableOpacity
                style={s.btn}
                onPress={handleNewRegistration}
                activeOpacity={0.85}
              >
                <Text style={s.btnTxt}>Fazer novo cadastro</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.loginWrap} onPress={() => router.push('/(auth)/login')}>
                <Text style={s.loginTxt}>Já tenho cadastro  <Text style={s.loginLink}>Entrar</Text></Text>
              </TouchableOpacity>
            </View>
          ) : (
          <>
          <Text style={s.title}>Novo acesso</Text>
          <Text style={s.subtitle}>Preencha seus dados. Você define sua senha depois, pelo e-mail que vamos te mandar.</Text>

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
                  onChangeText={(text: string) => {
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

          <View style={[s.fieldWrap, s.fieldWrapAutocomplete]}>
            <Text style={s.label}>CIDADE ONDE MORA (JAPÃO)</Text>
            <CityAutocomplete
              value={cidadeJp}
              error={!!errors.cidade_jp}
              onChangeText={(text) => setValue('cidade_jp', text, { shouldValidate: true })}
              onSelectCity={(city) => {
                setValue('cidade_jp', city.cidade, { shouldValidate: true })
                setValue('provincia_jp', city.provincia, { shouldValidate: true })
              }}
            />
            {errors.cidade_jp && <Text style={s.errTxt}>{errors.cidade_jp.message}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>QUAL SERVIÇO VOCÊ TEM INTERESSE?</Text>
            <Text style={s.hintTxt}>Pode escolher mais de uma opção.</Text>
            <View style={s.optionGrid}>
              {INTERESSE_CATEGORIA_OPTIONS.map((value) => {
                const active = interesseCategorias.includes(value)
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.optionChip, active && s.optionChipActive]}
                    activeOpacity={0.8}
                    onPress={() => toggleCategoria(value)}
                  >
                    <Text style={[s.optionChipText, active && s.optionChipTextActive]}>
                      {INTERESSE_CATEGORIA_LABEL[value]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {errors.interesse_categorias && <Text style={s.errTxt}>{errors.interesse_categorias.message}</Text>}

            {interesseCategorias.length > 0 && (
              <View style={[s.optionGrid, { marginTop: 10 }]}>
                {subopcoesDisponiveis(interesseCategorias).map((option) => {
                  const active = interesseSubopcoes.includes(option.value)
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[s.optionChip, active && s.optionChipActive]}
                      activeOpacity={0.8}
                      onPress={() => toggleSubopcao(option.value)}
                    >
                      <Text style={[s.optionChipText, active && s.optionChipTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
            {errors.interesse_subopcoes && <Text style={s.errTxt}>{errors.interesse_subopcoes.message}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>COMO CONHECEU A UENO ASSESSORIA?</Text>
            <View style={s.optionGrid}>
              {COMO_CONHECEU_OPTIONS.map((option) => {
                const active = comoConheceu === option
                return (
                  <TouchableOpacity
                    key={option}
                    style={[s.optionChip, active && s.optionChipActive]}
                    activeOpacity={0.8}
                    onPress={() => setValue('como_conheceu', option, { shouldValidate: true })}
                  >
                    <Text style={[s.optionChipText, active && s.optionChipTextActive]}>
                      {COMO_CONHECEU_LABEL[option]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {errors.como_conheceu && <Text style={s.errTxt}>{errors.como_conheceu.message}</Text>}
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

          <TouchableOpacity style={s.loginWrap} onPress={() => router.push('/(auth)/login')}>
            <Text style={s.loginTxt}>Já tenho cadastro  <Text style={s.loginLink}>Entrar</Text></Text>
          </TouchableOpacity>
          </>
          )}

        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/privacidade')} style={{ paddingVertical: 16, alignItems: 'center' }}><Text style={{ color: colors.navy800 }}>Política de privacidade</Text></TouchableOpacity>
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
  confirmEmail: { color: colors.navy800, fontWeight: '700' },
  fieldWrap: { marginBottom: 16 },
  fieldWrapAutocomplete: { zIndex: 20 },
  label: { fontSize: 11, fontWeight: '600', color: colors.ink500, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  hintTxt: { fontSize: 12, color: colors.ink400, marginBottom: 8 },
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
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: { borderColor: colors.navy800, backgroundColor: colors.navy50 },
  optionChipText: { color: colors.ink500, fontSize: 13, fontWeight: '700' },
  optionChipTextActive: { color: colors.navy800 },
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
