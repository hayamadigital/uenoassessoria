import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { colors } from '@/theme'

export default function AdminTabsLayout() {
  const { t } = useTranslation('common')

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.navy800,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: {
          borderTopColor: colors.ink100,
          borderTopWidth: 1,
          height: 78,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: 'rgba(255,255,255,0.97)',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: t('admin.tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="modulos"
        options={{
          title: t('admin.tabs.modules'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: t('admin.tabs.clients'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda/index"
        options={{
          title: t('admin.tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="processos/index"
        options={{
          title: t('admin.tabs.processes'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'layers' : 'layers-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
