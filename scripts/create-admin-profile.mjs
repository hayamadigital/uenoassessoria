import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDl8vzZwvRXmbvOPNhSpsKspcWPjM37M2A',
  authDomain: 'ueno-assessoria-475b9.firebaseapp.com',
  projectId: 'ueno-assessoria-475b9',
  storageBucket: 'ueno-assessoria-475b9.firebasestorage.app',
  messagingSenderId: '442537306636',
  appId: '1:442537306636:web:efb424f9cbf33ed8a95c29',
}

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Uso: node create-admin-profile.mjs <email> <senha>')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const cred = await signInWithEmailAndPassword(auth, email, password)
const uid = cred.user.uid
const now = new Date().toISOString()

await setDoc(doc(db, 'users', uid), {
  id: uid,
  role: 'admin',
  full_name: 'Administrador',
  email,
  phone: null,
  whatsapp: null,
  avatar_url: null,
  preferred_lang: 'pt-BR',
  is_active: true,
  endereco_jp: null,
  created_at: now,
  updated_at: now,
})

console.log(`Perfil admin criado com sucesso! UID: ${uid}`)
process.exit(0)
