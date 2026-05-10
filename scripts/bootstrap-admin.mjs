import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const admin = require(resolve(__dirname, '../functions/node_modules/firebase-admin/lib/index.js'))

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Uso: node scripts/bootstrap-admin.mjs <email> <senha>')
  process.exit(1)
}

const serviceAccountPath = resolve(__dirname, '../service-account.json')

let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
} catch {
  console.error('Arquivo service-account.json não encontrado.')
  console.error('Baixe em: Firebase Console → Project Settings → Service accounts → Generate new private key')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const auth = admin.auth()
const db = admin.firestore()

// Atualiza a senha do usuário existente
let uid
try {
  const existing = await auth.getUserByEmail(email)
  uid = existing.uid
  await auth.updateUser(uid, { password })
  console.log(`Usuário existente encontrado. UID: ${uid}`)
} catch {
  const newUser = await auth.createUser({ email, password, emailVerified: true })
  uid = newUser.uid
  console.log(`Novo usuário criado. UID: ${uid}`)
}

// Seta custom claim role: admin
await auth.setCustomUserClaims(uid, { role: 'admin' })
console.log('Custom claim role=admin definido.')

// Cria/atualiza doc em /users/{uid}
const now = new Date().toISOString()
await db.collection('users').doc(uid).set({
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
}, { merge: true })

console.log('Perfil admin criado no Firestore.')
console.log(`\nPronto! Login: ${email} / ${password}`)
process.exit(0)
