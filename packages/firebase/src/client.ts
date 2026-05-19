import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

export type { Firestore } from 'firebase/firestore'
export type { Auth } from 'firebase/auth'
export type { FirebaseStorage } from 'firebase/storage'
export type { Functions } from 'firebase/functions'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

function getFirebaseApp(config: FirebaseConfig) {
  if (getApps().length > 0) return getApp()
  return initializeApp(config)
}

export function createFirebaseClient(
  config: FirebaseConfig,
  options?: { createAuth?: (app: FirebaseApp) => ReturnType<typeof getAuth> },
) {
  const app = getFirebaseApp(config)
  const auth = options?.createAuth ? options.createAuth(app) : getAuth(app)
  return {
    db: getFirestore(app),
    auth,
    storage: getStorage(app),
    functions: getFunctions(app),
  }
}
