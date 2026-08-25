import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, shadows } from '@/theme'
import { db } from '@/lib/firebase'
import { Avatar } from '@/components/Avatar'
import { getProfile, updateProfile } from '@ueno/firebase/queries/perfis'

type EditableRole = 'admin' | 'instrutor'

function InfoLine({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoLine, last && s.infoLineLast]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

export default function AdminUserPermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => getProfile(db, id!),
    enabled: !!id,
  })

  const [role, setRole] = useState<EditableRole>('instrutor')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setRole((user.role === 'admin' || user.role === 'instrutor' ? user.role : 'instrutor') as EditableRole)
  }, [user])

  const handleSave = async () => {
    if (!user) return
    try {
      setSaving(true)
      const setRoleClaim = httpsCallable<{ uid: string; role: EditableRole }, { success: boolean }>(
        getFunctions(),
        'setRoleClaim',
      )
      await setRoleClaim({ uid: user.id, role })
      await updateProfile(db, user.id, { role })
      await queryClient.invalidateQueries({ queryKey: ['admin-team'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] })
      Alert.alert('Permissões atualizadas', 'O perfil do usuário foi atualizado com sucesso.')
      router.back()
    } catch (error) {
      Alert.alert('Falha ao salvar permissões', error instanceof Error ? error.message : 'Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} activeOpacity={0.8} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.ink900} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Dados do usuário</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {isLoading ? <ActivityIndicator color={colors.navy800} style={{ marginTop: 18 }} /> : null}

          {user ? (
            <>
              <View style={s.card}>
                <View style={s.profileHeader}>
                  <Avatar name={user.full_name} size={48} url={user.avatar_url} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.profileName} numberOfLines={1}>{user.full_name}</Text>
                    <Text style={s.profileEmail} numberOfLines={1}>{user.email}</Text>
                  </View>
                </View>
                <InfoLine label="Status" value={user.is_active ? 'Ativo' : 'Inativo'} />
                <InfoLine label="Perfil atual" value={user.role} last />
              </View>

              <View style={s.card}>
                <Text style={s.sectionTitle}>Permissão</Text>
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

                <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={handleSave} disabled={saving}>
                  <Text style={s.primaryBtnText}>{saving ? 'Salvando...' : 'Salvar permissões'}</Text>
                </TouchableOpacity>
              </View>
            </>
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
    marginBottom: 14,
    ...shadows.sm,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  profileName: { fontSize: 16, fontWeight: '800', color: colors.ink900 },
  profileEmail: { fontSize: 12.5, color: colors.ink500, marginTop: 3 },
  infoLine: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink100,
  },
  infoLineLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 11, fontWeight: '800', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13.5, fontWeight: '700', color: colors.ink900, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.ink500, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
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
})
