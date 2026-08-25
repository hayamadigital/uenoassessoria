import {
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
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
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useNavigation } from '@react-navigation/native'
import { sendPasswordResetEmail } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { DestinoFixo, PreferredLang, Profile } from '@ueno/firebase'
import { auth, db, storage } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar } from '@/components/Avatar'
import { colors, shadows } from '@/theme'
import { signOut } from '@ueno/firebase'
import { getProfile, listProfiles, updateProfile } from '@ueno/firebase/queries/perfis'
import { listDestinos, createDestino, updateDestino, toggleDestinoAtivo } from '@ueno/firebase/queries/destinos'
import { avatarPath } from '@ueno/firebase/storage'
import { useEffect, useMemo, useState } from 'react'

type IconName = keyof typeof Ionicons.glyphMap
type SectionKey = 'account' | 'language' | 'users' | 'notifications' | 'security' | 'locations' | 'company' | 'support'
type UserModalMode = 'invite' | 'edit'
type EditableRole = 'admin' | 'instrutor'

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
  const navigation = useNavigation()
  const { session, clear, setSession } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [isSaving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [preferredLang, setPreferredLang] = useState<PreferredLang>('pt-BR')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [taskAlerts, setTaskAlerts] = useState(true)
  const [financeAlerts, setFinanceAlerts] = useState(true)
  const [documentAlerts, setDocumentAlerts] = useState(true)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalMode, setUserModalMode] = useState<UserModalMode>('invite')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteRole, setInviteRole] = useState<EditableRole>('instrutor')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitingUser, setInvitingUser] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [locationGoogleMapsUrl, setLocationGoogleMapsUrl] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['admin-profile', session?.userId],
    queryFn: () => getProfile(db, session!.userId),
    enabled: !!session?.userId,
  })

  const { data: team = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['admin-team'],
    queryFn: () => listProfiles(db),
  })

  const { data: destinos = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['destinos'],
    queryFn: () => listDestinos(db),
  })

  const teamMembers = useMemo(
    () => team.filter((user) => user.role !== 'cliente'),
    [team],
  )

  const activeLocation = useMemo(
    () =>
      destinos.find(
        (destino) =>
          destino.endereco === profile?.endereco_jp &&
          destino.google_maps_url === (profile?.mapa_link_jp ?? null),
      ) ?? null,
    [destinos, profile?.endereco_jp, profile?.mapa_link_jp],
  )

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !inviteFullName.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome completo e email para gerar o convite.')
      return
    }

    try {
      setInvitingUser(true)
      const inviteUser = httpsCallable<
        { email: string; full_name: string; role: EditableRole },
        { user_id: string; reset_link?: string }
      >(getFunctions(), 'inviteUser')

      const { data } = await inviteUser({
        email: inviteEmail.trim(),
        full_name: inviteFullName.trim(),
        role: inviteRole,
      })

      setInviteLink(data.reset_link ?? null)
      if (userModalMode === 'invite') {
        setInviteEmail('')
        setInviteFullName('')
        setInviteRole('instrutor')
      }
      Alert.alert('Convite gerado', 'O link de acesso foi criado e está visível abaixo.')
      queryClient.invalidateQueries({ queryKey: ['admin-team'] })
    } catch (error) {
      Alert.alert('Falha ao gerar convite', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setInvitingUser(false)
    }
  }

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return
    try {
      setInvitingUser(true)
      const setRoleClaim = httpsCallable<{ uid: string; role: EditableRole }, { success: boolean }>(
        getFunctions(),
        'setRoleClaim',
      )
      await setRoleClaim({ uid: editingUser.id, role: inviteRole })
      await updateProfile(db, editingUser.id, { role: inviteRole })
      await queryClient.invalidateQueries({ queryKey: ['admin-team'] })
      setUserModalOpen(false)
      setEditingUser(null)
      Alert.alert('Permissões atualizadas', 'O perfil do usuário foi atualizado com sucesso.')
    } catch (error) {
      Alert.alert('Falha ao salvar permissões', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setInvitingUser(false)
    }
  }

  const handleOpenInviteLink = async () => {
    if (!inviteLink) return
    try {
      await Linking.openURL(inviteLink)
    } catch {
      Alert.alert('Não foi possível abrir o link', inviteLink)
    }
  }

  const handleSaveLocation = async () => {
    if (!locationName.trim() || !locationAddress.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome e endereço do local.')
      return
    }

    try {
      setSavingLocation(true)
      const payload = {
        nome: locationName.trim(),
        endereco: locationAddress.trim(),
        googleMapsUrl: locationGoogleMapsUrl.trim() || null,
      }

      const savedLocation = locationId
        ? await updateDestino(db, locationId, payload)
        : await createDestino(db, payload)

      if (session) {
        await updateProfile(db, session.userId, {
          endereco_jp: savedLocation.endereco,
          mapa_link_jp: savedLocation.google_maps_url,
        })
      }

      setLocationId(null)
      setLocationName('')
      setLocationAddress('')
      setLocationGoogleMapsUrl('')
      setLocationModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['destinos'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-profile', session?.userId] })
      Alert.alert('Pronto', 'Local salvo e aplicado ao perfil do admin.')
    } catch (error) {
      Alert.alert('Falha ao salvar local', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleEditLocation = (destino: DestinoFixo) => {
    setLocationId(destino.id)
    setLocationName(destino.nome)
    setLocationAddress(destino.endereco)
    setLocationGoogleMapsUrl(destino.google_maps_url ?? '')
    setLocationModalOpen(true)
    setActiveSection('locations')
  }

  const handleOpenNewLocation = () => {
    setLocationId(null)
    setLocationName('')
    setLocationAddress('')
    setLocationGoogleMapsUrl('')
    setLocationModalOpen(true)
  }

  const handleCloseLocationModal = () => {
    setLocationModalOpen(false)
    setLocationId(null)
    setLocationName('')
    setLocationAddress('')
    setLocationGoogleMapsUrl('')
  }

  const openInviteModal = () => {
    router.push('/(admin)/(hidden)/configuracoes/usuarios/novo')
  }

  const openEditPermissionsModal = (user: Profile) => {
    router.push({
      pathname: '/(admin)/(hidden)/configuracoes/usuarios/[id]',
      params: { id: user.id },
    })
  }

  const closeUserModal = () => {
    setUserModalOpen(false)
    setEditingUser(null)
    setInviteEmail('')
    setInviteFullName('')
    setInviteRole('instrutor')
  }

  const handleApplyLocation = async (destino: DestinoFixo) => {
    if (!session) return
    try {
      await updateProfile(db, session.userId, {
        endereco_jp: destino.endereco,
        mapa_link_jp: destino.google_maps_url,
      })
      await queryClient.invalidateQueries({ queryKey: ['admin-profile', session.userId] })
      Alert.alert('Local aplicado', `${destino.nome} agora é o local do admin.`)
    } catch (error) {
      Alert.alert('Falha ao aplicar local', error instanceof Error ? error.message : 'Tente novamente.')
    }
  }

  const handleToggleLocation = async (destino: DestinoFixo) => {
    try {
      await toggleDestinoAtivo(db, destino.id, !destino.is_active)
      await queryClient.invalidateQueries({ queryKey: ['destinos'] })
    } catch (error) {
      Alert.alert('Falha ao alterar local', error instanceof Error ? error.message : 'Tente novamente.')
    }
  }

  useEffect(() => {
    if (!session) return
    setFullName(profile?.full_name ?? session.fullName ?? '')
    setPhone(profile?.phone ?? '')
    setWhatsapp(profile?.whatsapp ?? '')
    setAvatarUrl(profile?.avatar_url ?? session.avatarUrl ?? null)
    setPreferredLang(profile?.preferred_lang ?? session.preferredLang ?? 'pt-BR')
  }, [profile, session])

  const headerTitle = useMemo(() => {
    if (activeSection === 'account') return t('configuracoes:mobile_admin.account_data')
    if (activeSection === 'language') return t('common:language')
    if (activeSection === 'users') return t('configuracoes:mobile_admin.users_permissions')
    if (activeSection === 'notifications') return t('configuracoes:mobile_admin.admin_notifications')
    if (activeSection === 'security') return t('configuracoes:tabs.seguranca')
    if (activeSection === 'locations') return 'Locais'
    if (activeSection === 'company') return t('configuracoes:mobile_admin.system')
    if (activeSection === 'support') return t('configuracoes:mobile_admin.internal_support')
    return t('common:settings')
  }, [activeSection, t])

  const handleBack = () => {
    if (locationModalOpen) {
      handleCloseLocationModal()
      return
    }
    if (userModalOpen) {
      closeUserModal()
      return
    }
    if (activeSection) {
      setActiveSection(null)
      return
    }
    router.back()
  }

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !activeSection,
      headerBackButtonMenuEnabled: false,
    })
  }, [activeSection, navigation])

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
        <Row icon="language-outline" label={t('common:language')} value={session?.preferredLang === 'en' ? 'English' : 'Português (BR)'} onPress={() => setActiveSection('language')} last />
      </Section>

      <Section title={t('configuracoes:mobile_admin.administration')}>
        <Row icon="people-outline" label={t('configuracoes:mobile_admin.users_permissions')} value={t('configuracoes:mobile_admin.user_count', { count: teamMembers.length || 0 })} onPress={() => setActiveSection('users')} />
        <Row icon="location-outline" label="Locais" value={activeLocation?.nome ?? 'Definir'} onPress={() => setActiveSection('locations')} />
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
        <FormSubsection title="Acesso" />
        <View style={s.accountGroupBody}>
          <InfoLine label="Email de acesso" value={session?.email ?? '-'} last />
        </View>
      </View>
      <SaveButton label={t('configuracoes:profile.save')} loading={isSaving} onPress={saveAccount} />
    </View>
  )

  const renderLocations = () => (
    <View style={s.panel}>
      <Text style={s.detailText}>
        Aqui você cadastra os locais fixos e escolhe qual deles fica vinculado ao perfil do admin.
      </Text>
      <TouchableOpacity style={s.newLocationBtn} activeOpacity={0.85} onPress={handleOpenNewLocation}>
        <Ionicons name="add-circle-outline" size={18} color={colors.white} />
        <Text style={s.newLocationBtnTxt}>Adicionar local</Text>
      </TouchableOpacity>
      <View style={s.locationsList}>
        {loadingLocations ? <ActivityIndicator color={colors.navy800} style={s.loader} /> : null}
        {destinos.map((destino, index) => (
          <View key={destino.id} style={[s.locationRow, index === destinos.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.locationName} numberOfLines={1}>{destino.nome}</Text>
              <Text style={s.locationAddress} numberOfLines={2}>{destino.endereco}</Text>
              <Text style={s.locationMap} numberOfLines={1}>
                {destino.google_maps_url ?? 'Sem link do Maps'}
              </Text>
            </View>
            <View style={s.locationActions}>
              <TouchableOpacity style={s.locationActionBtn} onPress={() => handleApplyLocation(destino)} activeOpacity={0.8}>
                <Ionicons name="location" size={16} color={colors.navy800} />
                <Text style={s.locationActionText}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.locationActionBtn} onPress={() => handleEditLocation(destino)} activeOpacity={0.8}>
                <Ionicons name="pencil" size={16} color={colors.ink700} />
                <Text style={s.locationActionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.locationActionBtn} onPress={() => handleToggleLocation(destino)} activeOpacity={0.8}>
                <Ionicons name={destino.is_active ? 'pause' : 'play'} size={16} color={destino.is_active ? colors.red : colors.green} />
                <Text style={[s.locationActionText, { color: destino.is_active ? colors.red : colors.green }]}>
                  {destino.is_active ? 'Desativar' : 'Ativar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {!loadingLocations && destinos.length === 0 ? (
          <Text style={s.emptyText}>Nenhum local cadastrado ainda.</Text>
        ) : null}
      </View>
      <Modal
        visible={locationModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLocationModal}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleCloseLocationModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalKeyboard}
          >
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>{locationId ? 'Editar local' : 'Novo local'}</Text>
                  <Text style={s.modalSub}>Preencha os campos e salve para atualizar o local fixo.</Text>
                </View>
                <TouchableOpacity style={s.modalCloseBtn} onPress={handleCloseLocationModal} activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color={colors.ink700} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={s.modalScroll}
                contentContainerStyle={s.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Field label="Nome do local" value={locationName} onChangeText={setLocationName} placeholder="Ex: Menkyo Center" />
                <Field label="Endereço" value={locationAddress} onChangeText={setLocationAddress} placeholder="Endereço completo" />
                <Field
                  label="Link do Google Maps"
                  value={locationGoogleMapsUrl}
                  onChangeText={setLocationGoogleMapsUrl}
                  placeholder="https://maps.google.com/..."
                  keyboardType="url"
                  autoCapitalize="none"
                  last
                />
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.modalSecondaryBtn} onPress={handleCloseLocationModal} activeOpacity={0.85}>
                    <Text style={s.modalSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalPrimaryBtn, savingLocation && { opacity: 0.7 }]}
                    onPress={handleSaveLocation}
                    activeOpacity={0.85}
                    disabled={savingLocation}
                  >
                    {savingLocation ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={s.modalPrimaryTxt}>Salvar local</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <Modal
        visible={userModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeUserModal}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeUserModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalKeyboard}
          >
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>
                    {userModalMode === 'invite' ? 'Convidar usuário' : 'Dados do usuário'}
                  </Text>
                  <Text style={s.modalSub}>
                    {userModalMode === 'invite'
                      ? 'Crie o acesso e copie o link para enviar manualmente.'
                      : 'Veja os dados e altere o perfil de acesso deste usuário.'}
                  </Text>
                </View>
                <TouchableOpacity style={s.modalCloseBtn} onPress={closeUserModal} activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color={colors.ink700} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={s.modalScroll}
                contentContainerStyle={s.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {userModalMode === 'invite' ? (
                  <>
                    <Field
                      label="Nome completo"
                      value={inviteFullName}
                      onChangeText={setInviteFullName}
                      placeholder="Nome da pessoa"
                      autoCapitalize="words"
                    />
                    <Field
                      label="Email"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="email@exemplo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </>
                ) : (
                  <>
                    <View style={s.permissionInfoBox}>
                      <View style={s.permissionProfileHeader}>
                        <Avatar
                          name={editingUser?.full_name ?? ''}
                          size={44}
                          url={editingUser?.avatar_url ?? null}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.permissionProfileName} numberOfLines={1}>
                            {editingUser?.full_name ?? '-'}
                          </Text>
                          <Text style={s.permissionProfileEmail} numberOfLines={1}>
                            {editingUser?.email ?? '-'}
                          </Text>
                        </View>
                      </View>
                      <InfoLine label="Status" value={editingUser?.is_active ? 'Ativo' : 'Inativo'} />
                      <InfoLine label="Perfil atual" value={editingUser?.role ?? '-'} last />
                    </View>
                    <Text style={s.permissionLabel}>Alterar permissão</Text>
                  </>
                )}

                {userModalMode === 'invite' ? <Text style={s.permissionLabel}>Permissão</Text> : null}
                <View style={s.segment}>
                  {[
                    ['instrutor', 'Instrutor'],
                    ['admin', 'Admin'],
                  ].map(([value, label]) => {
                    const selected = inviteRole === value
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[s.segmentItem, selected && s.segmentItemActive]}
                        activeOpacity={0.8}
                        onPress={() => setInviteRole(value as EditableRole)}
                      >
                        <Text style={[s.segmentText, selected && s.segmentTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {userModalMode === 'invite' && inviteLink ? (
                  <View style={s.linkBox}>
                    <Text style={s.linkTitle}>Link de acesso criado</Text>
                    <Text style={s.linkValue} selectable>
                      {inviteLink}
                    </Text>
                    <View style={s.linkActions}>
                      <TouchableOpacity style={s.linkActionBtn} onPress={handleOpenInviteLink} activeOpacity={0.8}>
                        <Ionicons name="open-outline" size={16} color={colors.navy800} />
                        <Text style={s.linkActionTxt}>Abrir link</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.linkActionBtn}
                        onPress={() => setInviteLink(null)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-outline" size={16} color={colors.ink700} />
                        <Text style={s.linkActionTxt}>Ocultar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={s.modalActions}>
                  <TouchableOpacity style={s.modalSecondaryBtn} onPress={closeUserModal} activeOpacity={0.85}>
                    <Text style={s.modalSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalPrimaryBtn, invitingUser && { opacity: 0.7 }]}
                    onPress={userModalMode === 'invite' ? handleInviteUser : handleSaveUserPermissions}
                    activeOpacity={0.85}
                    disabled={invitingUser}
                  >
                    {invitingUser ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={s.modalPrimaryTxt}>
                        {userModalMode === 'invite' ? 'Gerar convite' : 'Salvar permissões'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
      <Pressable style={s.newLocationBtn} onPress={openInviteModal}>
        <Ionicons name="person-add-outline" size={18} color={colors.white} />
        <Text style={s.newLocationBtnTxt}>Convidar usuário</Text>
      </Pressable>
      {inviteLink ? (
        <View style={s.linkBox}>
          <Text style={s.linkTitle}>Link de acesso criado</Text>
          <Text style={s.linkValue} selectable>
            {inviteLink}
          </Text>
          <View style={s.linkActions}>
            <TouchableOpacity style={s.linkActionBtn} onPress={handleOpenInviteLink} activeOpacity={0.8}>
              <Ionicons name="open-outline" size={16} color={colors.navy800} />
              <Text style={s.linkActionTxt}>Abrir link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.linkActionBtn}
              onPress={() => setInviteLink(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-outline" size={16} color={colors.ink700} />
              <Text style={s.linkActionTxt}>Ocultar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {loadingTeam ? <ActivityIndicator color={colors.navy800} style={s.loader} /> : null}
      {teamMembers.map((user, index) => (
        <Pressable
          key={user.id}
          style={[s.userRow, index === teamMembers.length - 1 && { borderBottomWidth: 0 }]}
          onPress={() => openEditPermissionsModal(user)}
        >
          <Avatar name={user.full_name} size={36} url={user.avatar_url} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.userName} numberOfLines={1}>{user.full_name}</Text>
            <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>
          <View style={s.userActionStack}>
            <Pressable style={s.userActionBtn} onPress={() => openEditPermissionsModal(user)}>
              <Ionicons name="eye-outline" size={14} color={colors.navy800} />
              <Text style={s.userActionTxt}>Ver</Text>
            </Pressable>
            <View style={[s.statusPill, !user.is_active && s.statusPillOff]}>
              <Text style={[s.statusText, !user.is_active && s.statusTextOff]}>{user.role}</Text>
            </View>
          </View>
        </Pressable>
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
    if (activeSection === 'language') return renderLanguage()
    if (activeSection === 'users') return renderUsers()
    if (activeSection === 'notifications') return renderNotifications()
    if (activeSection === 'security') return renderSecurity()
    if (activeSection === 'locations') return renderLocations()
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
  locationsList: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink100,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  locationRow: {
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  locationName: { fontSize: 13.5, fontWeight: '800', color: colors.ink900 },
  locationAddress: { fontSize: 11.5, color: colors.ink500, marginTop: 2, lineHeight: 16 },
  locationMap: { fontSize: 11, color: colors.navy800, marginTop: 3 },
  locationActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  locationActionBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.ink50,
  },
  locationActionText: { fontSize: 11.5, fontWeight: '800', color: colors.ink800 },
  emptyText: { padding: 16, fontSize: 12.5, color: colors.ink500, textAlign: 'center' },
  newLocationBtn: {
    minHeight: 46,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  newLocationBtnTxt: { fontSize: 13.5, fontWeight: '800', color: colors.white },
  inviteCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.navy50,
  },
  inviteTitle: { fontSize: 14, fontWeight: '800', color: colors.navy900 },
  inviteHint: { fontSize: 12, lineHeight: 18, color: colors.ink600, marginTop: 4, marginBottom: 12 },
  inviteFields: { gap: 10, marginBottom: 12 },
  permissionInfoBox: {
    borderWidth: 1,
    borderColor: colors.ink100,
    borderRadius: 14,
    backgroundColor: colors.ink50,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  permissionProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  permissionProfileName: { fontSize: 14, fontWeight: '800', color: colors.ink900 },
  permissionProfileEmail: { fontSize: 12, color: colors.ink500, marginTop: 2 },
  permissionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
    marginBottom: -2,
  },
  userActionStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  userActionBtn: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.navy50,
  },
  userActionTxt: { fontSize: 11.5, fontWeight: '800', color: colors.navy800 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.navy50 },
  statusPillOff: { backgroundColor: colors.ink100 },
  statusText: { fontSize: 10.5, fontWeight: '700', color: colors.navy800, textTransform: 'capitalize' },
  statusTextOff: { color: colors.ink500 },
  linkBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.navy100,
    backgroundColor: colors.white,
  },
  linkTitle: { fontSize: 13.5, fontWeight: '800', color: colors.navy900 },
  linkValue: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy100,
    color: colors.ink800,
    fontSize: 12,
    lineHeight: 17,
  },
  linkActions: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  linkActionBtn: {
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
  linkActionTxt: { fontSize: 12.5, fontWeight: '800', color: colors.ink800 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 77, 0.35)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.ink100,
    paddingTop: 10,
    maxHeight: '88%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.ink200,
    marginBottom: 10,
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.ink900 },
  modalSub: { fontSize: 12, color: colors.ink500, marginTop: 3, lineHeight: 17 },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.ink50,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: { flexGrow: 0 },
  modalContent: { paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryTxt: { fontSize: 13.5, fontWeight: '800', color: colors.ink800 },
  modalPrimaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryTxt: { fontSize: 13.5, fontWeight: '800', color: colors.white },
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
