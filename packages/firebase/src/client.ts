import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

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
  options?: {
    createAuth?: (app: FirebaseApp) => ReturnType<typeof getAuth>
    /** Aponta pro Firebase Local Emulator Suite em vez do projeto de produção — só pra testes locais. */
    useEmulators?: boolean
    emulatorHost?: string
  },
) {
  const app = getFirebaseApp(config)
  const auth = options?.createAuth ? options.createAuth(app) : getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)
  const functions = getFunctions(app)

  if (options?.useEmulators) {
    const host = options.emulatorHost ?? '127.0.0.1'
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    connectStorageEmulator(storage, host, 9199)
    connectFunctionsEmulator(functions, host, 5001)
  }

  return { app, db, auth, storage, functions }
}
