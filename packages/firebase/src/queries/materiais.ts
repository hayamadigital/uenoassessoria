import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import type {
  CategoriaMaterial,
  CategoriaMaterialInsert,
  ClienteMaterialProgresso,
  Material,
  MaterialCard,
  MaterialCardInsert,
  MaterialInsert,
  SimuladoConfig,
  SimuladoConfigInsert,
  QuestaoWithDetails,
  ClienteSimuladoResultado,
  ClienteSimuladoResultadoInsert,
  ClienteSimuladoResultadoWithProfile,
} from '../types'

function toMaterial(id: string, data: Record<string, unknown>): Material {
  return {
    id,
    is_active: true,
    conteudo_texto: null,
    banner_url: null,
    album_urls: [],
    ...data,
  } as unknown as Material
}

function toMaterialCard(id: string, data: Record<string, unknown>): MaterialCard {
  return { id, ...data } as MaterialCard
}

export async function listCategoriasMaterial(db: Firestore): Promise<CategoriaMaterial[]> {
  const snap = await getDocs(query(collection(db, 'categorias_material'), orderBy('ordem')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoriaMaterial)
}

export async function listMateriais(
  db: Firestore,
  categoriaId?: string,
  onlyPublic = false,
): Promise<Material[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('ordem')]
  if (categoriaId) constraints.push(where('categoria_id', '==', categoriaId))
  if (onlyPublic) constraints.push(where('is_public', '==', true))
  const snap = await getDocs(query(collection(db, 'materiais'), ...constraints))
  return snap.docs.map((d) => toMaterial(d.id, d.data()))
}

export function subscribeMateriais(
  db: Firestore,
  onChange: (materiais: Material[]) => void,
  categoriaId?: string,
  onlyPublic = false,
): Unsubscribe {
  const constraints: Parameters<typeof query>[1][] = [orderBy('ordem')]
  if (categoriaId) constraints.push(where('categoria_id', '==', categoriaId))
  if (onlyPublic) constraints.push(where('is_public', '==', true))
  return onSnapshot(query(collection(db, 'materiais'), ...constraints), (snap) => {
    onChange(snap.docs.map((d) => toMaterial(d.id, d.data())))
  })
}

export function subscribeCategoriasMaterial(
  db: Firestore,
  onChange: (categorias: CategoriaMaterial[]) => void,
): Unsubscribe {
  return onSnapshot(query(collection(db, 'categorias_material'), orderBy('ordem')), (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CategoriaMaterial))
  })
}

export async function getMaterial(db: Firestore, id: string): Promise<Material> {
  const snap = await getDoc(doc(db, 'materiais', id))
  if (!snap.exists()) throw new Error('Material not found')
  return toMaterial(snap.id, snap.data())
}

export async function createMaterial(db: Firestore, input: MaterialInsert): Promise<Material> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'materiais'), { ...input, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return toMaterial(snap.id, snap.data()!)
}

export async function updateMaterial(
  db: Firestore,
  id: string,
  input: Partial<MaterialInsert>,
): Promise<Material> {
  await updateDoc(doc(db, 'materiais', id), { ...input, updated_at: new Date().toISOString() })
  const snap = await getDoc(doc(db, 'materiais', id))
  return toMaterial(snap.id, snap.data()!)
}

export async function deleteMaterial(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'materiais', id))
}

export async function createCategoriaMaterial(
  db: Firestore,
  input: CategoriaMaterialInsert,
): Promise<CategoriaMaterial> {
  const ref = await addDoc(collection(db, 'categorias_material'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() } as CategoriaMaterial
}

export async function updateCategoriaMaterial(
  db: Firestore,
  id: string,
  input: Partial<CategoriaMaterialInsert>,
): Promise<CategoriaMaterial> {
  await updateDoc(doc(db, 'categorias_material', id), input)
  const snap = await getDoc(doc(db, 'categorias_material', id))
  return { id: snap.id, ...snap.data() } as CategoriaMaterial
}

export async function deleteCategoriaMaterial(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'categorias_material', id))
}

// ── Cards de material ─────────────────────────────────────────────

export async function listMaterialCards(db: Firestore, materialId: string): Promise<MaterialCard[]> {
  const snap = await getDocs(
    query(collection(db, 'materiais', materialId, 'cards'), orderBy('ordem')),
  )
  return snap.docs.map((d) => toMaterialCard(d.id, d.data()))
}

export async function createMaterialCard(
  db: Firestore,
  input: MaterialCardInsert,
): Promise<MaterialCard> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'materiais', input.material_id, 'cards'), {
    ...input,
    created_at: now,
    updated_at: now,
  })
  const snap = await getDoc(ref)
  return toMaterialCard(snap.id, snap.data()!)
}

export async function updateMaterialCard(
  db: Firestore,
  materialId: string,
  id: string,
  input: Partial<Omit<MaterialCardInsert, 'material_id'>>,
): Promise<MaterialCard> {
  await updateDoc(doc(db, 'materiais', materialId, 'cards', id), {
    ...input,
    updated_at: new Date().toISOString(),
  })
  const snap = await getDoc(doc(db, 'materiais', materialId, 'cards', id))
  return toMaterialCard(snap.id, snap.data()!)
}

export async function deleteMaterialCard(
  db: Firestore,
  materialId: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, 'materiais', materialId, 'cards', id))
}

export async function upsertProgresso(
  db: Firestore,
  clienteId: string,
  materialId: string,
  progressoPct: number,
  concluido: boolean,
): Promise<ClienteMaterialProgresso> {
  const docRef = doc(db, 'clientes', clienteId, 'materiais_progresso', materialId)
  const data: ClienteMaterialProgresso = {
    id: materialId,
    cliente_id: clienteId,
    material_id: materialId,
    progresso_pct: progressoPct,
    concluido,
    ultimo_acesso: new Date().toISOString(),
  }
  await setDoc(docRef, data, { merge: true })
  return data
}

export async function getClienteProgresso(
  db: Firestore,
  clienteId: string,
): Promise<ClienteMaterialProgresso[]> {
  const snap = await getDocs(collection(db, 'clientes', clienteId, 'materiais_progresso'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ClienteMaterialProgresso)
}

// ── Simulado Config ────────────────────────────────────────────────

export async function getSimuladoConfig(
  db: Firestore,
  materialId: string,
): Promise<SimuladoConfig | null> {
  const snap = await getDoc(doc(db, 'simulado_config', materialId))
  if (!snap.exists()) return null
  return { material_id: snap.id, ...snap.data() } as SimuladoConfig
}

export async function upsertSimuladoConfig(
  db: Firestore,
  input: SimuladoConfigInsert,
): Promise<SimuladoConfig> {
  const now = new Date().toISOString()
  await setDoc(
    doc(db, 'simulado_config', input.material_id),
    { ...input, updated_at: now, created_at: now },
    { merge: true },
  )
  const snap = await getDoc(doc(db, 'simulado_config', input.material_id))
  return { material_id: snap.id, ...snap.data() } as SimuladoConfig
}

// ── Simulado Questões ──────────────────────────────────────────────

export async function listSimuladoQuestoes(
  db: Firestore,
  simuladoId: string,
): Promise<QuestaoWithDetails[]> {
  const snap = await getDocs(
    query(
      collection(db, 'simulado_config', simuladoId, 'questoes'),
      orderBy('ordem'),
    ),
  )

  const questaoIds = snap.docs.map((d) => d.data().questao_id as string)

  const questoes = await Promise.all(
    questaoIds.map(async (qid) => {
      const qSnap = await getDoc(doc(db, 'questoes', qid))
      const [opSnap, imgSnap, explicacaoImgSnap] = await Promise.all([
        getDocs(query(collection(db, 'questoes', qid, 'opcoes'), orderBy('ordem'))),
        getDocs(query(collection(db, 'questoes', qid, 'imagens'), orderBy('ordem'))),
        getDocs(query(collection(db, 'questoes', qid, 'explicacao_imagens'), orderBy('ordem'))),
      ])
      return {
        id: qSnap.id,
        ...qSnap.data(),
        opcoes: opSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        imagens: imgSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        explicacao_imagens: explicacaoImgSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      } as QuestaoWithDetails
    }),
  )

  return questoes
}

export async function setSimuladoQuestoes(
  db: Firestore,
  simuladoId: string,
  questaoIds: string[],
): Promise<void> {
  const uniqueQuestaoIds = Array.from(new Set(questaoIds))
  const existingSnap = await getDocs(collection(db, 'simulado_config', simuladoId, 'questoes'))
  await Promise.all(existingSnap.docs.map((d) => deleteDoc(d.ref)))

  await Promise.all(
    uniqueQuestaoIds.map((questao_id, ordem) =>
      addDoc(collection(db, 'simulado_config', simuladoId, 'questoes'), { questao_id, ordem }),
    ),
  )
}

// ── Resultados ─────────────────────────────────────────────────────

export async function listSimuladoResultados(
  db: Firestore,
  simuladoId: string,
): Promise<ClienteSimuladoResultadoWithProfile[]> {
  const snap = await getDocs(
    query(
      collection(db, 'simulado_resultados'),
      where('simulado_id', '==', simuladoId),
      orderBy('created_at', 'desc'),
    ),
  )

  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as ClienteSimuladoResultado
      const profileSnap = await getDoc(doc(db, 'users', data.cliente_id))
      const profile = profileSnap.data() as { full_name: string; email: string }
      return { ...data, id: d.id, cliente: { full_name: profile.full_name, email: profile.email } }
    }),
  )
}

export async function listClienteSimuladoResultados(
  db: Firestore,
  clienteId: string,
  legacyClienteId?: string,
): Promise<ClienteSimuladoResultado[]> {
  const clienteIds = Array.from(new Set([clienteId, legacyClienteId].filter(Boolean) as string[]))
  const snaps = await Promise.all(
    clienteIds.map((id) =>
      getDocs(
        query(
          collection(db, 'simulado_resultados'),
          where('cliente_id', '==', id),
        ),
      ),
    ),
  )

  const resultados = new Map<string, ClienteSimuladoResultado>()
  snaps.forEach((snap) => {
    snap.docs.forEach((d) => {
      resultados.set(d.id, { ...d.data(), id: d.id } as ClienteSimuladoResultado)
    })
  })

  return Array.from(resultados.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createSimuladoResultado(
  db: Firestore,
  input: ClienteSimuladoResultadoInsert,
): Promise<ClienteSimuladoResultado> {
  const ref = await addDoc(collection(db, 'simulado_resultados'), {
    ...input,
    created_at: new Date().toISOString(),
  })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() } as ClienteSimuladoResultado
}
