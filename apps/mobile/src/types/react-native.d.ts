declare module 'react-native' {
  import type { ComponentType } from 'react'

  export type ViewStyle = Record<string, unknown>
  export type TextStyle = Record<string, unknown>
  export type ImageStyle = Record<string, unknown>
  export type StyleProp<T> = T | T[] | null | undefined

  export type NativeSyntheticEvent<T = unknown> = { nativeEvent: T }
  export type NativeScrollEvent = Record<string, unknown>
  export type TextInputChangeEventData = { text: string }

  export const View: ComponentType<any>
  export const Text: ComponentType<any>
  export const Image: ComponentType<any>
  export const ScrollView: ComponentType<any>
  export const TouchableOpacity: ComponentType<any>
  export const Pressable: ComponentType<any>
  export const TextInput: ComponentType<any>
  export const ActivityIndicator: ComponentType<any>
  export const Switch: ComponentType<any>
  export const KeyboardAvoidingView: ComponentType<any>
  export const Modal: ComponentType<any>

  export const Keyboard: {
    dismiss: () => void
  }

  export const Alert: {
    alert: (...args: any[]) => void
  }

  export const Linking: {
    openURL: (url: string) => Promise<void>
  }

  export const Platform: {
    OS: 'ios' | 'android' | 'web' | string
    select: <T>(options: Record<string, T>) => T | undefined
  }

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T
    flatten: (style: any) => any
    compose: (style1: any, style2: any) => any
    absoluteFillObject: ViewStyle
    hairlineWidth: number
  }
}

declare module 'react-native-webview' {
  import type { ComponentType } from 'react'

  export const WebView: ComponentType<any>
  export default WebView
}

declare module 'expo-av' {
  import type { ComponentType } from 'react'

  export const Video: ComponentType<any>
  export const ResizeMode: Record<string, string>
}

declare module 'react-native-gesture-handler' {
  import type { ComponentType } from 'react'

  export const GestureHandlerRootView: ComponentType<any>
}
