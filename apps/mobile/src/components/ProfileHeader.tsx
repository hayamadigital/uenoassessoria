import type React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors } from '@/theme'

export function ProfileHeader({
  title,
  subtitle = 'Meu perfil',
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={20} color={colors.ink700} />
      </TouchableOpacity>
      <View style={s.titleWrap}>
        <Text style={s.subtitle}>{subtitle}</Text>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
      </View>
      <View style={s.right}>{right}</View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.ink50,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  subtitle: { color: colors.ink500, fontSize: 12, fontWeight: '700' },
  title: { color: colors.ink900, fontSize: 22, fontWeight: '900', letterSpacing: 0, marginTop: 1 },
  right: { minWidth: 44, alignItems: 'flex-end' },
})
