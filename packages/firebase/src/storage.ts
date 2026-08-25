import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from 'firebase/storage'

export async function uploadFile(
  storage: FirebaseStorage,
  path: string,
  file: File | Blob,
): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function getFileUrl(storage: FirebaseStorage, path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}

export async function deleteFile(storage: FirebaseStorage, path: string): Promise<void> {
  await deleteObject(ref(storage, path))
}

// ── Path helpers — mirrors the 6 Supabase bucket folders ──────────

export function documentoPath(clienteId: string, fileName: string) {
  return `documentos/${clienteId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
}

export function contratoPath(clienteId: string, contratoId: string, fileName: string) {
  return `contratos/${clienteId}/${contratoId}/${fileName}`
}

export function comprovantePath(pagamentoId: string, fileName: string) {
  return `comprovantes/${pagamentoId}/${fileName}`
}

export function gastoComprovantePath(fileName: string) {
  return `comprovantes/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
}

export function materialPath(tipo: string, fileName: string) {
  return `materiais/${tipo}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileName.split('.').pop()}`
}

export function assinaturaPath(clienteId: string, fileName: string) {
  return `assinaturas/${clienteId}/${fileName}`
}

export function avatarPath(uid: string, fileName: string) {
  return `avatares/${uid}/${fileName}`
}

export function avisoBannerPath(avisoId: string, fileName: string) {
  const ext = fileName.split('.').pop() ?? 'jpg'
  return `avisos/${avisoId}/banner/${Date.now()}.${ext}`
}

export function avisoPdfPath(avisoId: string, fileName: string) {
  const ext = fileName.split('.').pop() ?? 'pdf'
  return `avisos/${avisoId}/pdf/${Date.now()}.${ext}`
}

export function avisoCarrosselPath(avisoId: string, fileName: string) {
  const ext = fileName.split('.').pop() ?? 'jpg'
  return `avisos/${avisoId}/carrossel/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
}
