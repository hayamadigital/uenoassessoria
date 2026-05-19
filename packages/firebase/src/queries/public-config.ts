import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import type { PublicAppConfig } from '../types'

const PUBLIC_CONFIG_ID = 'public'

function normalizeSupportWhatsapp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPublicConfig(data: Record<string, unknown>): PublicAppConfig {
  const config: PublicAppConfig = {
    id: PUBLIC_CONFIG_ID,
    support_whatsapp: normalizeSupportWhatsapp(data.support_whatsapp ?? data.whatsapp_support ?? data.whatsapp),
  }
  if (typeof data.created_at === 'string') config.created_at = data.created_at
  if (typeof data.updated_at === 'string') config.updated_at = data.updated_at
  return config
}

export async function getPublicAppConfig(db: Firestore): Promise<PublicAppConfig> {
  const snap = await getDoc(doc(db, 'app_config', PUBLIC_CONFIG_ID))
  if (!snap.exists()) {
    return {
      id: PUBLIC_CONFIG_ID,
      support_whatsapp: null,
    }
  }
  return toPublicConfig(snap.data())
}

export async function updatePublicAppConfig(
  db: Firestore,
  input: Pick<PublicAppConfig, 'support_whatsapp'>,
): Promise<PublicAppConfig> {
  const now = new Date().toISOString()
  const ref = doc(db, 'app_config', PUBLIC_CONFIG_ID)
  const existing = await getDoc(ref)
  const payload = {
    support_whatsapp: normalizeSupportWhatsapp(input.support_whatsapp),
    updated_at: now,
    ...(existing.exists() ? {} : { created_at: now }),
  }
  const data = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
  await setDoc(ref, data, { merge: true })
  const snap = await getDoc(ref)
  return snap.exists() ? toPublicConfig(snap.data()) : { id: PUBLIC_CONFIG_ID, support_whatsapp: null }
}
