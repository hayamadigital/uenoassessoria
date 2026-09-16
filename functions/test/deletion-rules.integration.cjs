const { test, before, beforeEach, after } = require('node:test')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing')
const { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } = require('firebase/firestore')
const { ref, uploadBytes, getBytes } = require('firebase/storage')
let env
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-ueno-release',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
  })
})
beforeEach(async () => {
  await env.clearFirestore(); await env.clearStorage()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    for (const [path, data] of Object.entries({
      'users/owner': { full_name: 'Owner', role: 'cliente' },
      'users/other': { full_name: 'Other', role: 'cliente' },
      'users/admin': { full_name: 'Admin', role: 'admin' },
      'users/teacher': { full_name: 'Teacher', role: 'instrutor' },
      'clientes/client': { profile_id: 'owner', assigned_instrutor_id: 'teacher' },
      'clientes/unassigned': { profile_id: 'other', assigned_instrutor_id: null },
      'account_deletions/owner': { status: 'pending' },
      '_retained_accounts/owner': { reason: 'Obrigação', expires_at: '2030-01-01' },
    })) await setDoc(doc(db, path), data)
    await uploadBytes(ref(ctx.storage(), 'retained-accounts/owner/contract.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' })
  })
})
after(async () => { await env?.cleanup() })
const owner = () => env.authenticatedContext('owner', { role: 'cliente', email_verified: true })
const admin = () => env.authenticatedContext('admin', { role: 'admin' })

test('pending deletion does not block account access; user cannot forge or cancel a job', async () => {
  await assertSucceeds(getDoc(doc(owner().firestore(), 'users/owner')))
  await assertFails(getDoc(doc(owner().firestore(), 'users/other')))
  await assertFails(setDoc(doc(owner().firestore(), 'account_deletions/other'), { status: 'pending' }))
  await assertFails(updateDoc(doc(owner().firestore(), 'account_deletions/owner'), { status: 'completed' }))
  await assertFails(getDoc(doc(owner().firestore(), 'account_deletions/owner')))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'account_deletions/owner')))
})
test('processing deletion blocks old tokens from Firestore and Storage', async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'account_deletions/owner'), { status: 'processing' }))
  await assertFails(getDoc(doc(owner().firestore(), 'users/owner')))
  await assertFails(getDoc(doc(owner().firestore(), 'clientes/client')))
  await assertFails(uploadBytes(ref(owner().storage(), 'avatares/owner/new.png'), new Uint8Array([1]), { contentType: 'image/png' }))
  await assertSucceeds(getDoc(doc(admin().firestore(), 'users/owner')))
})
test('pending users can upload their own avatar; legal archives cannot be downloaded with client SDKs', async () => {
  await assertSucceeds(uploadBytes(ref(owner().storage(), 'avatares/owner/new.png'), new Uint8Array([1]), { contentType: 'image/png' }))
  await assertFails(getDoc(doc(admin().firestore(), '_retained_accounts/owner')))
  await assertFails(getBytes(ref(admin().storage(), 'retained-accounts/owner/contract.pdf')))
  await assertFails(getBytes(ref(owner().storage(), 'retained-accounts/owner/contract.pdf')))
})
test('instructors can query assigned clients but cannot read unrestricted profiles', async () => {
  const db = env.authenticatedContext('teacher', { role: 'instrutor' }).firestore()
  await assertSucceeds(getDocs(query(collection(db, 'clientes'), where('assigned_instrutor_id', '==', 'teacher'))))
  await assertFails(getDoc(doc(db, 'clientes/unassigned')))
  await assertFails(getDoc(doc(db, 'users/owner')))
})
