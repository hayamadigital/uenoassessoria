import { createFirebaseClient } from '@ueno/firebase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApp as getNativeApp } from '@react-native-firebase/app'
import {
  getToken as getNativeAppCheckToken,
  initializeAppCheck as initializeNativeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check'
import { getAuth, initializeAuth, type Auth } from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'
import {
  CustomProvider,
  getToken as getWebAppCheckToken,
  initializeAppCheck as initializeWebAppCheck,
} from 'firebase/app-check'
import { Platform } from 'react-native'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
}

if (Object.values(firebaseConfig).some((v) => !v)) {
  throw new Error('Missing Firebase environment variables. Check EXPO_PUBLIC_FIREBASE_* in .env')
}

function createPersistentAuth(app: FirebaseApp): Auth {
  try {
    const authModule = require('firebase/auth') as typeof import('firebase/auth') & {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown
    }
    const persistence = authModule.getReactNativePersistence?.(AsyncStorage)
    if (!persistence) return getAuth(app)
    return initializeAuth(app, { persistence: persistence as never })
  } catch {
    return getAuth(app)
  }
}

export const { app, db, auth, storage, functions } = createFirebaseClient(firebaseConfig, {
  createAuth: createPersistentAuth,
})

const APP_CHECK_TOKEN_CACHE_MS = 50 * 60 * 1000

async function getNativeTokenWithRetry(nativeAppCheck: ReturnType<typeof initializeNativeAppCheck>) {
  let lastError: unknown

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await getNativeAppCheckToken(nativeAppCheck, attempt > 0)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('provider-not-ready') || attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }

  throw lastError
}

async function initializeIosAppCheck(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true

  try {
    const nativeProvider = new ReactNativeFirebaseAppCheckProvider()
    nativeProvider.configure({
      apple: {
        provider: process.env.NODE_ENV === 'production' ? 'appAttest' : 'debug',
      },
    })

    const nativeAppCheck = initializeNativeAppCheck(getNativeApp(), {
      provider: nativeProvider,
      isTokenAutoRefreshEnabled: true,
    })

    const webAppCheck = initializeWebAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token } = await getNativeTokenWithRetry(nativeAppCheck)
          return {
            token,
            // Native App Check tokens use a one-hour TTL by default. Refreshing
            // ten minutes early avoids sending a token close to expiration.
            expireTimeMillis: Date.now() + APP_CHECK_TOKEN_CACHE_MS,
          }
        },
      }),
      isTokenAutoRefreshEnabled: true,
    })

    await getWebAppCheckToken(webAppCheck, true)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[AppCheck] iOS ainda não validado: ${message}`)
    return false
  }
}

export const appCheckReady = initializeIosAppCheck()
