import { createFirebaseClient } from '@ueno/firebase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuth, initializeAuth, type Auth } from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'

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

export const { db, auth, storage, functions } = createFirebaseClient(firebaseConfig, {
  createAuth: createPersistentAuth,
})
