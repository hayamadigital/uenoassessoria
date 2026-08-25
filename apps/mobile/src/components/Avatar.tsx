import { View, Text } from 'react-native'
import { AppImage } from '@/components/AppImage'

const PALETTE = [
  '#1E3A8A', '#0891B2', '#0F766E', '#7E22CE',
  '#D97706', '#DC2626', '#16A34A', '#2A4BB0',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function bgFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface AvatarProps {
  name: string
  size?: number
  url?: string | null
}

export function Avatar({ name, size = 40, url }: AvatarProps) {
  const r = size / 2
  if (url) {
    return <AppImage source={{ uri: url }} style={{ width: size, height: size, borderRadius: r }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bgFor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700', letterSpacing: -0.5 }}>
        {getInitials(name)}
      </Text>
    </View>
  )
}
