import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/lib/firebase'
import { getProfile, updateProfile } from '@ueno/firebase/queries/perfis'
import { useAuthStore } from '@/stores/auth.store'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'
import type { PreferredLang } from '@ueno/firebase'

const LANGS: Array<{ value: PreferredLang; label: string; sub: string }> = [
  { value: 'pt-BR', label: 'Portugues (BR)', sub: 'Interface em portugues' },
  { value: 'en', label: 'English', sub: 'Interface in English' },
]

export default function PreferenciasScreen() {
  const { session, setSession } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.userId],
    queryFn: () => getProfile(db, session!.userId),
    enabled: !!session,
  })

  const saveLang = useMutation({
    mutationFn: async (preferred_lang: PreferredLang) => {
      if (!session) return
      await updateProfile(db, session.userId, { preferred_lang })
      setSession({ ...session, preferredLang: preferred_lang })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', session?.userId] })
      Alert.alert('Preferencia salva', 'O idioma foi atualizado.')
    },
    onError: () => Alert.alert('Nao foi possivel salvar', 'Tente novamente.'),
  })

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Idioma" />
      <View style={s.content}>
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="globe-outline" size={18} color={colors.navy800} />
            <Text style={s.cardTitle}>Idioma</Text>
          </View>
          {LANGS.map((lang) => {
            const active = (profile?.preferred_lang ?? session?.preferredLang ?? 'pt-BR') === lang.value
            return (
              <TouchableOpacity key={lang.value} style={s.row} onPress={() => saveLang.mutate(lang.value)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{lang.label}</Text>
                  <Text style={s.rowSub}>{lang.sub}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={colors.navy800} /> : <View style={s.radio} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink50 },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink100, borderRadius: 14, padding: 14, gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { color: colors.ink900, fontWeight: '800', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderTopWidth: 1, borderTopColor: colors.ink100, paddingTop: 10 },
  rowTitle: { color: colors.ink900, fontWeight: '800', fontSize: 14 },
  rowSub: { color: colors.ink500, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.ink300 },
})
