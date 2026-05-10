import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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

export function onAuthChange(auth: Auth, callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function getIdTokenResult(user: User) {
  return user.getIdTokenResult()
}
