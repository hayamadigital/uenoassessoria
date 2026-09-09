import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  type Auth,
  type User,
} from 'firebase/auth'

export type { User }

export async function signIn(auth: Auth, email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signUp(auth: Auth, email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function signOut(auth: Auth) {
  await firebaseSignOut(auth)
}

export async function sendVerificationEmail(auth: Auth, user: User) {
  auth.languageCode = 'pt-BR'
  await sendEmailVerification(user)
}

export async function reloadAuthUser(user: User) {
  await reload(user)
}

export function onAuthChange(auth: Auth, callback: (user: User | null) => void) {
  // Also notify consumers when custom claims are refreshed. New client
  // registrations receive their role claim immediately after account creation.
  return onIdTokenChanged(auth, callback)
}

export async function getIdTokenResult(user: User) {
  return user.getIdTokenResult()
}
