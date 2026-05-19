import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { sendPasswordResetEmail } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { PreferredLang } from '@ueno/firebase'
import { auth, db, storage } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors, shadows } from '@/theme'
import { signOut } from '@ueno/firebase'
import { getProfile, listProfiles, updateProfile } from '@ueno/firebase/queries/perfis'
import { avatarPath } from '@ueno/firebase/storage'
import { useEffect, useMemo, useState } from 'react'

type IconName = keyof typeof Ionicons.glyphMap
type SectionKey = 'account' | 'email' | 'language' | 'users' | 'notifications' | 'security' | 'company' | 'support'

type RowProps = {
  icon: IconName
  label: string
  value?: string
  color?: string
  last?: boolean
  onPress?: () => void
  right?: ReactNode
}

function Row({ icon, label, value, color = colors.ink700, last, onPress, right }: RowProps) {
  return (
    <TouchableOpacity style={[r.row, last && r.rowLast]} activeOpacity={0.75} onPress={onPress}>
      <View style={[r.iconWrap, { backgroundColor: color + '16' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={r.label} numberOfLines={1}>{label}</Text>
      {value ? <Text style={r.value} numberOfLines={1}>{value}</Text> : null}
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.ink300} />}
    </TouchableOpacity>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={r.section}>
      <Text style={r.sectionLabel}>{title}</Text>
      <View style={r.sectionCard}>{children}</View>
    </View>
  )
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  last,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'url'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  last?: boolean
}) {
  return (
    <View style={[f.field, last && f.fieldLast]}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
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

function FormSubsection({ title }: { title: string }) {
  return (
    <View style={s.formSubsection}>
      <Text style={s.formSubsectionTitle}>{title}</Text>
    </View>
  )
}

function localUriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => resolve(xhr.response)
    xhr.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'))
    xhr.responseType = 'blob'
    xhr.open('GET', uri, true)
    xhr.send(null)
  })
}

function SaveButton({ label, loading, onPress }: { label: string; loading?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.saveBtn, loading && { opacity: 0.7 }]} activeOpacity={0.8} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>{label}</Text>}
    </TouchableOpacity>
  )
}

export default function AdminConfiguracoesScreen() {
  const { t, i18n } = useTranslation(['common', 'configuracoes'])
  const { session, clear, setSession } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [isSaving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [enderecoJp, setEnderecoJp] = useState('')
  const [cepJp, setCepJp] = useState('')
  const [provinciaJp, setProvinciaJp] = useState('')
  const [cidadeJp, setCidadeJp] = useState('')
  const [bairroJp, setBairroJp] = useState('')
  const [numeroBlocoJp, setNumeroBlocoJp] = useState('')
  const [apartamentoJp, setApartamentoJp] = useState('')
  const [complementoJp, setComplementoJp] = useState('')
  const [mapaLinkJp, setMapaLinkJp] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [preferredLang, setPreferredLang] = useState<PreferredLang>('pt-BR')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [taskAlerts, setTaskAlerts] = useState(true)
  const [financeAlerts, setFinanceAlerts] = useState(true)
  const [documentAlerts, setDocumentAlerts] = useState(true)

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['admin-profile', session?.userId],
    queryFn: () => getProfile(db, session!.userId),
    enabled: !!session?.userId,
  })

  const { data: team = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['admin-team'],
    queryFn: () => listProfiles(db),
  })

  const teamMembers = useMemo(
    () => team.filter((user) => user.role !== 'cliente'),
    [team],
  )

  useEffect(() => {
    if (!session) return
    setFullName(profile?.full_name ?? session.fullName ?? '')
    setPhone(profile?.phone ?? '')
    setWhatsapp(profile?.whatsapp ?? '')
    setEnderecoJp(profile?.endereco_jp ?? '')
    setCepJp(profile?.cep_jp ?? '')
    setProvinciaJp(profile?.provincia_jp ?? '')
    setCidadeJp(profile?.cidade_jp ?? '')
    setBairroJp(profile?.bairro_jp ?? '')
    setNumeroBlocoJp(profile?.numero_bloco_jp ?? '')
    setApartamentoJp(profile?.apartamento_jp ?? '')
    setComplementoJp(profile?.complemento_jp ?? '')
    setMapaLinkJp(profile?.mapa_link_jp ?? '')
    setAvatarUrl(profile?.avatar_url ?? session.avatarUrl ?? null)
    setEmail(profile?.email ?? session.email ?? '')
    setPreferredLang(profile?.preferred_lang ?? session.preferredLang ?? 'pt-BR')
  }, [profile, session])

  const headerTitle = useMemo(() => {
    if (activeSection === 'account') return t('configuracoes:mobile_admin.account_data')
    if (activeSection === 'email') return t('configuracoes:mobile_admin.access_email')
    if (activeSection === 'language') return t('common:language')
    if (activeSection === 'users') return t('configuracoes:mobile_admin.users_permissions')
    if (activeSection === 'notifications') return t('configuracoes:mobile_admin.admin_notifications')
    if (activeSection === 'security') return t('configuracoes:tabs.seguranca')
    if (activeSection === 'company') return t('configuracoes:mobile_admin.system')
    if (activeSection === 'support') return t('configuracoes:mobile_admin.internal_support')
    return t('common:settings')
  }, [activeSection, t])

  const handleBack = () => {
    if (activeSection) {
      setActiveSection(null)
      return
    }
    router.back()
  }

  const syncSession = (patch: Partial<NonNullable<typeof session>>) => {
    if (!session) return
    setSession({ ...session, ...patch })
  }

  const clean = (value: string) => value.trim() || null

  const handlePickAvatar = async () => {
    if (!session) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria nas configurações.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
      quality: 0.75,
    })
    if (result.canceled || !result.assets[0]) return

    const previousAvatar = avatarUrl
    const asset = result.assets[0]
    const uri = asset.uri
    setAvatarUrl(uri)

    try {
      setUploadingAvatar(true)
      const sourceName = asset.fileName ?? uri.split('/').pop() ?? 'avatar.jpg'
      const contentType = asset.mimeType ?? 'image/jpeg'
      const extFromMime = contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/png'
          ? 'png'
          : null
      const ext = extFromMime ?? (sourceName.includes('.') ? sourceName.split('.').pop() : 'jpg')
      const ownerUid = auth.currentUser?.uid ?? session.userId
      const path = avatarPath(ownerUid, `admin-${session.userId}-avatar-${Date.now()}.${ext}`)
      const storageRef = ref(storage, path)
      const blob = await localUriToBlob(uri)
      try {
        await uploadBytes(storageRef, blob, { contentType })
      } finally {
        ;(blob as Blob & { close?: () => void }).close?.()
      }
      const publicUrl = await getDownloadURL(storageRef)
      await updateProfile(db, session.userId, { avatar_url: publicUrl })
      setAvatarUrl(publicUrl)
      syncSession({ avatarUrl: publicUrl })
      await queryClient.invalidateQueries({ queryKey: ['admin-profile', session.userId] })
    } catch (error) {
      console.error('Erro ao enviar avatar:', error)
      setAvatarUrl(previousAvatar)
      Alert.alert('Não foi possível enviar a foto', 'Tente novamente com outra imagem.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const saveAccount = async () => {
    if (!session) return
    if (!fullName.trim()) {
      Alert.alert(t('configuracoes:mobile_admin.name_required_title'), t('configuracoes:mobile_admin.name_required_message'))
      return
    }
    setSaving(true)
    try {
      await updateProfile(db, session.userId, {
        full_name: fullName.trim(),
        phone: clean(phone),
        whatsapp: clean(whatsapp),
        endereco_jp: clean(enderecoJp),
        cep_jp: clean(cepJp),
        provincia_jp: clean(provinciaJp),
        cidade_jp: clean(cidadeJp),
        bairro_jp: clean(bairroJp),
        numero_bloco_jp: clean(numeroBlocoJp),
        apartamento_jp: clean(apartamentoJp),
        complemento_jp: clean(complementoJp),
        mapa_link_jp: clean(mapaLinkJp),
        preferred_lang: preferredLang,
      })
      syncSession({ fullName: fullName.trim(), preferredLang })
      await i18n.changeLanguage(preferredLang)
      await queryClient.invalidateQueries({ queryKey: ['admin-profile', session.userId] })
      Alert.alert(t('configuracoes:mobile_admin.done'), t('configuracoes:mobile_admin.account_updated'))
      setActiveSection(null)
    } catch (error) {
      Alert.alert(t('configuracoes:mobile_admin.save_failed'), error instanceof Error ? error.message : t('configuracoes:mobile_admin.try_again'))
    } finally {
      setSaving(false)
    }
  }

  const saveLanguage = async () => {
    if (!session) return
    setSaving(true)
    try {
      await updateProfile(db, session.userId, { preferred_lang: preferredLang })
      syncSession({ preferredLang })
      await i18n.changeLanguage(preferredLang)
      await queryClient.invalidateQueries({ queryKey: ['admin-profile', session.userId] })
      Alert.alert(t('configuracoes:mobile_admin.done'), t('configuracoes:mobile_admin.language_updated'))
      setActiveSection(null)
    } catch (error) {
      Alert.alert(t('configuracoes:mobile_admin.save_failed'), error instanceof Error ? error.message : t('configuracoes:mobile_admin.try_again'))
    } finally {
      setSaving(false)
    }
  }

  const selectLanguage = (language: PreferredLang) => {
    setPreferredLang(language)
    void i18n.changeLanguage(language)
  }

  const handlePasswordReset = async () => {
    if (!session?.email) return
    try {
      await sendPasswordResetEmail(auth, session.email)
      Alert.alert(t('configuracoes:mobile_admin.email_sent'), t('configuracoes:mobile_admin.password_reset_sent'))
    } catch (error) {
      Alert.alert(t('configuracoes:mobile_admin.send_failed'), error instanceof Error ? error.message : t('configuracoes:mobile_admin.try_again'))
    }
  }

  const handleLogout = () => {
    Alert.alert(t('common:logout'), t('configuracoes:mobile_admin.logout_confirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut(auth)
          clear()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const renderMain = () => (
    <>
      <View style={s.profileCard}>
        <Avatar name={session?.fullName ?? 'Admin'} size={64} url={session?.avatarUrl} />
        <View style={s.profileText}>
          <Text style={s.name} numberOfLines={1}>{session?.fullName ?? 'Equipe Ueno'}</Text>
          <Text style={s.email} numberOfLines={1}>{session?.email ?? '-'}</Text>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark" size={12} color={colors.navy800} />
            <Text style={s.roleText}>{t('configuracoes:mobile_admin.administrator')}</Text>
          </View>
        </View>
      </View>

      <Section title={t('configuracoes:mobile_admin.account')}>
        <Row icon="person-outline" label={t('configuracoes:mobile_admin.account_data')} value={session?.fullName ?? '-'} onPress={() => setActiveSection('account')} />
        <Row icon="mail-outline" label={t('configuracoes:mobile_admin.access_email')} value={session?.email ?? '-'} onPress={() => setActiveSection('email')} />
        <Row icon="language-outline" label={t('common:language')} value={session?.preferredLang === 'en' ? 'English' : 'Português (BR)'} onPress={() => setActiveSection('language')} last />
      </Section>

      <Section title={t('configuracoes:mobile_admin.administration')}>
        <Row icon="people-outline" label={t('configuracoes:mobile_admin.users_permissions')} value={t('configuracoes:mobile_admin.user_count', { count: teamMembers.length || 0 })} onPress={() => setActiveSection('users')} />
        <Row icon="notifications-outline" label={t('configuracoes:mobile_admin.admin_notifications')} onPress={() => setActiveSection('notifications')} />
        <Row icon="lock-closed-outline" label={t('configuracoes:mobile_admin.account_security')} onPress={() => setActiveSection('security')} last />
      </Section>

      <Section title={t('configuracoes:mobile_admin.system')}>
        <Row icon="business-outline" label="Ueno Assessoria" value="Mobile admin" onPress={() => setActiveSection('company')} />
        <Row icon="help-circle-outline" label={t('configuracoes:mobile_admin.internal_support')} onPress={() => setActiveSection('support')} />
        <Row icon="log-out-outline" label={t('common:logout')} color={colors.red} onPress={handleLogout} right={<View />} last />
      </Section>
    </>
  )

  const renderAccount = () => (
    <View style={[s.panel, s.accountPanel]}>
      {loadingProfile ? <ActivityIndicator color={colors.navy800} style={s.loader} /> : null}
      <View style={s.photoField}>
        <View style={s.photoAvatarWrap}>
          <Avatar name={fullName || session?.fullName || 'Admin'} size={76} url={avatarUrl} />
          <TouchableOpacity style={s.photoCameraBtn} onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.85}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="camera" size={15} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.photoTitle}>Foto de Perfil</Text>
          <Text style={s.photoHint}>Use uma foto para identificar sua conta no sistema.</Text>
          <TouchableOpacity style={s.photoPickerBtn} onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.85}>
            {uploadingAvatar ? <ActivityIndicator size="small" color={colors.navy800} /> : <Ionicons name="image-outline" size={15} color={colors.navy800} />}
            <Text style={s.photoPickerTxt}>{uploadingAvatar ? 'Enviando foto...' : 'Escolher da galeria'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.accountGroup}>
        <FormSubsection title="Nome" />
        <View style={s.accountGroupBody}>
          <Field label={t('configuracoes:profile.full_name')} value={fullName} onChangeText={setFullName} placeholder={t('configuracoes:mobile_admin.admin_name_placeholder')} autoCapitalize="words" last />
        </View>
      </View>
      <View style={s.accountGroup}>
        <FormSubsection title="Contato" />
        <View style={s.accountGroupBody}>
          <Field label={t('common:phone')} value={phone} onChangeText={setPhone} placeholder={t('common:phone')} keyboardType="phone-pad" />
          <Field label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" last />
        </View>
      </View>
      <View style={s.accountGroup}>
        <FormSubsection title="Endereço" />
        <View style={s.accountGroupBody}>
          <Field label="CEP" value={cepJp} onChangeText={setCepJp} keyboardType="number-pad" />
          <Field label="Província" value={provinciaJp} onChangeText={setProvinciaJp} />
          <Field label="Cidade" value={cidadeJp} onChangeText={setCidadeJp} />
          <Field label="Bairro" value={bairroJp} onChangeText={setBairroJp} />
          <Field label={t('configuracoes:profile.endereco_jp')} value={enderecoJp} onChangeText={setEnderecoJp} placeholder={t('configuracoes:mobile_admin.address_placeholder')} />
          <Field label="Número / Bloco" value={numeroBlocoJp} onChangeText={setNumeroBlocoJp} />
          <Field label="Apartamento" value={apartamentoJp} onChangeText={setApartamentoJp} />
          <Field label="Complemento" value={complementoJp} onChangeText={setComplementoJp} />
          <Field label="Link do mapa" value={mapaLinkJp} onChangeText={setMapaLinkJp} keyboardType="url" autoCapitalize="none" last />
        </View>
      </View>
      <SaveButton label={t('configuracoes:profile.save')} loading={isSaving} onPress={saveAccount} />
    </View>
  )

  const renderEmail = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>
        Este email é usado para entrar no app e não pode ser alterado por aqui. Para trocar sua senha, envie um link de redefinição para o email cadastrado.
      </Text>
      <InfoLine label="Email de acesso" value={email || session?.email || '-'} />
      <TouchableOpacity style={[s.actionRow, { borderBottomWidth: 0 }]} activeOpacity={0.8} onPress={handlePasswordReset}>
        <Ionicons name="key-outline" size={19} color={colors.navy800} />
        <Text style={s.actionText}>Alterar senha</Text>
      </TouchableOpacity>
    </View>
  )

  const renderLanguage = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>{t('configuracoes:mobile_admin.language_help')}</Text>
      <View style={s.segment}>
        {[
          ['pt-BR', 'Português (BR)'],
          ['en', 'English'],
        ].map(([value, label]) => {
          const selected = preferredLang === value
          return (
            <TouchableOpacity
              key={value}
              style={[s.segmentItem, selected && s.segmentItemActive]}
              activeOpacity={0.8}
              onPress={() => selectLanguage(value as PreferredLang)}
            >
              <Text style={[s.segmentText, selected && s.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <SaveButton label={t('configuracoes:profile.save')} loading={isSaving} onPress={saveLanguage} />
    </View>
  )

  const renderUsers = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>{t('configuracoes:mobile_admin.users_help')}</Text>
      {loadingTeam ? <ActivityIndicator color={colors.navy800} style={s.loader} /> : null}
      {teamMembers.map((user, index) => (
        <View key={user.id} style={[s.userRow, index === teamMembers.length - 1 && { borderBottomWidth: 0 }]}>
          <Avatar name={user.full_name} size={36} url={user.avatar_url} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.userName} numberOfLines={1}>{user.full_name}</Text>
            <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>
          <View style={[s.statusPill, !user.is_active && s.statusPillOff]}>
            <Text style={[s.statusText, !user.is_active && s.statusTextOff]}>{user.role}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderNotifications = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>{t('configuracoes:mobile_admin.notifications_help')}</Text>
      {[
        [t('configuracoes:mobile_admin.push_device'), pushEnabled, setPushEnabled],
        [t('configuracoes:mobile_admin.urgent_tasks'), taskAlerts, setTaskAlerts],
        [t('configuracoes:mobile_admin.financial_alerts'), financeAlerts, setFinanceAlerts],
        [t('configuracoes:mobile_admin.pending_documents'), documentAlerts, setDocumentAlerts],
      ].map(([label, value, setter], index) => (
        <View key={label as string} style={[s.switchRow, index === 3 && { borderBottomWidth: 0 }]}>
          <Text style={s.switchLabel}>{label as string}</Text>
          <Switch
            value={value as boolean}
            onValueChange={setter as (value: boolean) => void}
            trackColor={{ false: colors.ink200, true: colors.navy100 }}
            thumbColor={(value as boolean) ? colors.navy800 : colors.white}
          />
        </View>
      ))}
      <SaveButton label={t('configuracoes:preferences.save')} onPress={() => {
        Alert.alert(t('configuracoes:mobile_admin.preferences_saved'), t('configuracoes:mobile_admin.device_preferences_updated'))
        setActiveSection(null)
      }} />
    </View>
  )

  const renderSecurity = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>{t('configuracoes:mobile_admin.security_help')}</Text>
      <TouchableOpacity style={s.actionRow} activeOpacity={0.8} onPress={handlePasswordReset}>
        <Ionicons name="key-outline" size={19} color={colors.navy800} />
        <Text style={s.actionText}>{t('configuracoes:mobile_admin.send_password_reset')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.actionRow, { borderBottomWidth: 0 }]} activeOpacity={0.8} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={19} color={colors.red} />
        <Text style={[s.actionText, { color: colors.red }]}>{t('configuracoes:mobile_admin.sign_out_account')}</Text>
      </TouchableOpacity>
    </View>
  )

  const renderCompany = () => (
    <View style={s.panel}>
      <InfoLine label={t('configuracoes:mobile_admin.app')} value="Ueno Assessoria Mobile" />
      <InfoLine label={t('configuracoes:mobile_admin.area')} value="Admin" />
      <InfoLine label={t('configuracoes:mobile_admin.environment')} value="Firebase" />
      <InfoLine label={t('configuracoes:mobile_admin.active_account')} value={profile?.is_active === false ? t('common:no') : t('common:yes')} last />
    </View>
  )

  const renderSupport = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>{t('configuracoes:mobile_admin.support_help')}</Text>
      <InfoLine label={t('configuracoes:mobile_admin.channel')} value={t('configuracoes:mobile_admin.ueno_team')} />
      <InfoLine label={t('configuracoes:mobile_admin.account_email')} value={session?.email ?? '-'} />
      <InfoLine label={t('configuracoes:mobile_admin.user_id')} value={session?.userId ?? '-'} last />
    </View>
  )

  const renderDetail = () => {
    if (activeSection === 'account') return renderAccount()
    if (activeSection === 'email') return renderEmail()
    if (activeSection === 'language') return renderLanguage()
    if (activeSection === 'users') return renderUsers()
    if (activeSection === 'notifications') return renderNotifications()
    if (activeSection === 'security') return renderSecurity()
    if (activeSection === 'company') return renderCompany()
    if (activeSection === 'support') return renderSupport()
    return renderMain()
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} activeOpacity={0.75} onPress={handleBack}>
            <Ionicons name="chevron-back" size={21} color={colors.ink900} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {renderDetail()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function InfoLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoLine, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
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
  headerBtn: {
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 10, paddingBottom: 34 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    borderRadius: 18,
    ...shadows.sm,
  },
  profileText: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', color: colors.ink900, letterSpacing: -0.3 },
  email: { fontSize: 12, color: colors.ink500, marginTop: 2 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.navy50,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.navy800 },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    padding: 14,
    ...shadows.sm,
  },
  accountPanel: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  detailText: { fontSize: 13, color: colors.ink500, lineHeight: 20, marginBottom: 14 },
  photoField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  photoAvatarWrap: { position: 'relative' },
  photoCameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink900 },
  photoHint: { fontSize: 11.5, color: colors.ink500, marginTop: 2, marginBottom: 8, lineHeight: 16 },
  photoPickerBtn: {
    minHeight: 38,
    alignSelf: 'flex-start',
    borderRadius: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.navy50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  photoPickerTxt: { fontSize: 12, fontWeight: '800', color: colors.navy800 },
  accountGroup: {
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  accountGroupBody: {
    padding: 14,
    paddingBottom: 15,
  },
  formSubsection: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 10,
    backgroundColor: colors.ink50,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  formSubsectionTitle: { fontSize: 12, fontWeight: '800', color: colors.ink700, textTransform: 'uppercase', letterSpacing: 0.5 },
  loader: { marginVertical: 10 },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  segment: { gap: 10, marginBottom: 12 },
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  userName: { fontSize: 13.5, fontWeight: '700', color: colors.ink900 },
  userEmail: { fontSize: 11.5, color: colors.ink500, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.navy50 },
  statusPillOff: { backgroundColor: colors.ink100 },
  statusText: { fontSize: 10.5, fontWeight: '700', color: colors.navy800, textTransform: 'capitalize' },
  statusTextOff: { color: colors.ink500 },
  switchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  switchLabel: { fontSize: 13.5, fontWeight: '600', color: colors.ink900 },
  actionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  actionText: { fontSize: 13.5, fontWeight: '700', color: colors.ink900 },
  infoLine: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.ink100 },
  infoLabel: { fontSize: 11.5, fontWeight: '700', color: colors.ink400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 13.5, fontWeight: '600', color: colors.ink900 },
})

const r = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 9,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '600', color: colors.ink900 },
  value: { maxWidth: 150, fontSize: 12.5, color: colors.ink500 },
})

const f = StyleSheet.create({
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 0 },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.ink500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink100,
    backgroundColor: colors.ink50,
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink900,
  },
})
