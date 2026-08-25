import { Alert, Linking, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ProfileHeader } from '@/components/ProfileHeader'
import { colors } from '@/theme'

export default function NotificacoesScreen() {
  const openDeviceSettings = () => {
    Alert.alert(
      'Configurações do aparelho',
      'As permissões de push são controladas pelo sistema. Abra as configurações para ativar ou revisar as notificações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir configurações', onPress: () => Linking.openURL('app-settings:') },
      ],
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <ProfileHeader title="Notificações" />
      <View style={s.content}>
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="notifications-outline" size={18} color={colors.navy800} />
            <Text style={s.cardTitle}>Notificações</Text>
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Alertas do processo</Text>
              <Text style={s.rowSub}>Etapas, documentos, pagamentos e agendamentos.</Text>
            </View>
            <Switch value disabled trackColor={{ true: colors.navy100, false: colors.ink200 }} thumbColor={colors.navy800} />
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Avisos da assessoria</Text>
              <Text style={s.rowSub}>Comunicados importantes enviados pela equipe Ueno.</Text>
            </View>
            <Switch value disabled trackColor={{ true: colors.navy100, false: colors.ink200 }} thumbColor={colors.navy800} />
          </View>

          <TouchableOpacity style={s.settingsBtn} onPress={openDeviceSettings} activeOpacity={0.85}>
            <Ionicons name={Platform.OS === 'ios' ? 'settings-outline' : 'phone-portrait-outline'} size={17} color={colors.navy800} />
            <Text style={s.settingsText}>Abrir configurações do aparelho</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.note}>
          O app envia notificações importantes por padrão. Para pausar ou bloquear notificações, use as permissões do aparelho.
        </Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderTopWidth: 1, borderTopColor: colors.ink100, paddingTop: 10 },
  rowTitle: { color: colors.ink900, fontWeight: '800', fontSize: 14 },
  rowSub: { color: colors.ink500, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  settingsBtn: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: colors.navy50,
    borderWidth: 1,
    borderColor: colors.navy100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  settingsText: { color: colors.navy800, fontSize: 13, fontWeight: '900' },
  note: { color: colors.ink500, fontSize: 12.5, lineHeight: 19, paddingHorizontal: 4 },
})
