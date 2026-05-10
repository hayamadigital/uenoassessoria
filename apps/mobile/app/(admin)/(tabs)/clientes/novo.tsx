import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors } from '@/theme'

type Step = 1 | 2 | 3

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Identidade' },
  { n: 2, label: 'Contato' },
  { n: 3, label: 'Serviço' },
]

const VISTOS = ['Permanente · 永住者', 'Temporário · 定住者', 'Técnico · 技術', 'Estudante · 留学', 'Outro']

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>
}

function FieldInput({
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
}: {
  placeholder: string
  value: string
  onChangeText: (v: string) => void
  icon?: keyof typeof Ionicons.glyphMap
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
}) {
  return (
    <View style={s.fieldWrap}>
      {icon && <Ionicons name={icon} size={14} color={colors.ink400} />}
      <TextInput
        style={[s.fieldInput, !icon && { paddingLeft: 0 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.ink400}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  )
}

export default function NovoClienteScreen() {
  const [step, setStep] = useState<Step>(1)
  const [enviaBV, setEnviaBV] = useState(true)

  // Step 1 — Identidade
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [visto, setVisto] = useState('')
  const [cidade, setCidade] = useState('')
  const [showVistoOpts, setShowVistoOpts] = useState(false)

  // Step 2 — Contato
  const [whatsapp, setWhatsapp] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')

  // Step 3 — Serviço
  const [observacoes, setObservacoes] = useState('')

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step)
    // TODO: submit on step 3
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
    else router.back()
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.ink700} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Clientes</Text>
          <Text style={s.headerTitle}>Novo cliente</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Stepper */}
        <View style={s.stepper}>
          {STEPS.map(({ n, label }) => (
            <View key={n} style={{ flex: 1 }}>
              <View style={[s.stepBar, step >= n && s.stepBarActive]} />
              <Text style={[s.stepLbl, step >= n && s.stepLblActive]}>
                Etapa {n} · {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Avatar placeholder */}
        <View style={s.avatarWrap}>
          <View style={s.avatarCircle}>
            <Ionicons name="person-outline" size={28} color={colors.ink400} />
          </View>
          <Text style={s.avatarTxt}>Adicionar foto</Text>
        </View>

        {step === 1 && (
          <View style={s.form}>
            <View>
              <FieldLabel label="Nome completo" />
              <FieldInput placeholder="Ex: Marina Okada" value={nome} onChangeText={setNome} icon="person-outline" />
            </View>
            <View>
              <FieldLabel label="E-mail" />
              <FieldInput placeholder="marina@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
            </View>
            <View>
              <FieldLabel label="Telefone (Japão)" />
              <FieldInput placeholder="+81 80-0000-0000" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
            </View>
            <View>
              <FieldLabel label="Visto" />
              <TouchableOpacity style={s.fieldWrap} onPress={() => setShowVistoOpts((v) => !v)} activeOpacity={0.8}>
                <Text style={[s.fieldInput, !visto && { color: colors.ink400 }]}>
                  {visto || 'Selecione'}
                </Text>
                <Ionicons name={showVistoOpts ? 'chevron-up' : 'chevron-down'} size={14} color={colors.ink400} />
              </TouchableOpacity>
              {showVistoOpts && (
                <View style={s.vistoOpts}>
                  {VISTOS.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[s.vistoOpt, visto === v && s.vistoOptActive]}
                      onPress={() => { setVisto(v); setShowVistoOpts(false) }}
                    >
                      <Text style={[s.vistoOptTxt, visto === v && s.vistoOptTxtActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View>
              <FieldLabel label="Cidade · Província" />
              <FieldInput placeholder="Toyota-shi · Aichi" value={cidade} onChangeText={setCidade} icon="location-outline" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={s.form}>
            <View>
              <FieldLabel label="WhatsApp" />
              <FieldInput placeholder="+81 80-0000-0000" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
            </View>
            <View>
              <FieldLabel label="Endereço completo (Japão)" />
              <FieldInput placeholder="Aichi-ken, Toyota-shi..." value={endereco} onChangeText={setEndereco} icon="home-outline" />
            </View>
            <View>
              <FieldLabel label="CPF" />
              <FieldInput placeholder="000.000.000-00" value={cpf} onChangeText={setCpf} keyboardType="phone-pad" />
            </View>
            <View>
              <FieldLabel label="Data de nascimento" />
              <FieldInput placeholder="DD/MM/AAAA" value={nascimento} onChangeText={setNascimento} keyboardType="phone-pad" />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={s.form}>
            <View>
              <FieldLabel label="Observações iniciais" />
              <View style={[s.fieldWrap, { alignItems: 'flex-start', minHeight: 100 }]}>
                <TextInput
                  style={[s.fieldInput, { paddingTop: 2 }]}
                  placeholder="Informações relevantes sobre o cliente..."
                  placeholderTextColor={colors.ink400}
                  value={observacoes}
                  onChangeText={setObservacoes}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </View>
        )}

        {/* Toggle boas-vindas */}
        <View style={s.toggleRow}>
          <Ionicons name="notifications-outline" size={15} color={colors.navy800} />
          <Text style={s.toggleTxt}>Enviar e-mail de boas-vindas</Text>
          <Switch
            value={enviaBV}
            onValueChange={setEnviaBV}
            trackColor={{ true: colors.navy800, false: colors.ink200 }}
            thumbColor="white"
          />
        </View>

        {/* Buttons */}
        <View style={s.btns}>
          <TouchableOpacity style={s.btnBack} onPress={handleBack} activeOpacity={0.8}>
            <Text style={s.btnBackTxt}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnNext} onPress={handleNext} activeOpacity={0.8}>
            <Text style={s.btnNextTxt}>{step === 3 ? 'Criar cliente' : 'Próximo'}</Text>
            {step < 3 && <Ionicons name="chevron-forward" size={14} color="white" />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink100,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub: { fontSize: 11, color: colors.ink500 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.34 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  stepper: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: colors.ink200, marginBottom: 6 },
  stepBarActive: { backgroundColor: colors.navy800 },
  stepLbl: { fontSize: 10, fontWeight: '600', color: colors.ink400 },
  stepLblActive: { color: colors.navy800 },

  avatarWrap: { alignItems: 'center', marginBottom: 22 },
  avatarCircle: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: colors.ink50, borderWidth: 2, borderColor: colors.ink200,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontSize: 11.5, color: colors.navy800, fontWeight: '600', marginTop: 9 },

  form: { gap: 14, marginBottom: 18 },
  fieldLabel: {
    fontSize: 10, fontWeight: '600', color: colors.ink500,
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 5,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: colors.ink50, borderRadius: 11, padding: 12,
    borderWidth: 1, borderColor: colors.ink100,
  },
  fieldInput: { flex: 1, fontSize: 13, color: colors.ink900 },

  vistoOpts: {
    backgroundColor: colors.white, borderRadius: 11, marginTop: 4,
    borderWidth: 1, borderColor: colors.ink100, overflow: 'hidden',
  },
  vistoOpt: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  vistoOptActive: { backgroundColor: colors.navy50 },
  vistoOptTxt: { fontSize: 13, color: colors.ink700 },
  vistoOptTxtActive: { color: colors.navy800, fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.navy50, borderWidth: 1, borderColor: colors.navy100,
    borderRadius: 12, padding: 11, marginBottom: 20,
  },
  toggleTxt: { flex: 1, fontSize: 12, color: colors.ink700 },

  btns: { flexDirection: 'row', gap: 8 },
  btnBack: {
    flex: 1, padding: 14, borderRadius: 14,
    backgroundColor: colors.ink50, borderWidth: 1, borderColor: colors.ink100,
    alignItems: 'center',
  },
  btnBackTxt: { fontSize: 13, fontWeight: '600', color: colors.ink700 },
  btnNext: {
    flex: 1.4, padding: 14, borderRadius: 14,
    backgroundColor: colors.navy800,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnNextTxt: { fontSize: 13, fontWeight: '700', color: 'white' },
})
