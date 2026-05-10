import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore'
import type {
  Questao,
  QuestaoWithDetails,
  QuestaoOpcaoInsert,
  QuestaoImagemInsert,
  QuestaoInsert,
  QuestaoErroReport,
  QuestaoErroReportInsert,
  QuestaoErroReportWithDetails,
  StatusErroReport,
} from '../types'

async function fetchQuestaoWithDetails(db: Firestore, id: string): Promise<QuestaoWithDetails> {
  const [qSnap, opSnap, imgSnap] = await Promise.all([
    getDoc(doc(db, 'questoes', id)),
    getDocs(query(collection(db, 'questoes', id, 'opcoes'), orderBy('ordem'))),
    getDocs(query(collection(db, 'questoes', id, 'imagens'), orderBy('ordem'))),
  ])
  if (!qSnap.exists()) throw new Error('Questao not found')
  return {
    id: qSnap.id,
    ...qSnap.data(),
    opcoes: opSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    imagens: imgSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  } as QuestaoWithDetails
}

export async function listQuestoes(
  db: Firestore,
  opts?: { categoriaId?: string; search?: string; tipoOpcao?: string },
): Promise<QuestaoWithDetails[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]
  if (opts?.categoriaId) constraints.push(where('categoria_id', '==', opts.categoriaId))
  if (opts?.tipoOpcao) constraints.push(where('tipo_opcao', '==', opts.tipoOpcao))

  const snap = await getDocs(query(collection(db, 'questoes'), ...constraints))
  let questoes = snap.docs

  if (opts?.search) {
    const s = opts.search.toLowerCase()
    questoes = questoes.filter((d) =>
      d.id.toLowerCase().includes(s) ||
      (d.data().enunciado as string)?.toLowerCase().includes(s),
    )
  }

  return Promise.all(questoes.map((d) => fetchQuestaoWithDetails(db, d.id)))
}

export async function getQuestaoWithDetails(
  db: Firestore,
  id: string,
): Promise<QuestaoWithDetails> {
  return fetchQuestaoWithDetails(db, id)
}

export async function createQuestao(
  db: Firestore,
  questaoData: QuestaoInsert,
  opcoes: Omit<QuestaoOpcaoInsert, 'questao_id'>[],
  imagens: Omit<QuestaoImagemInsert, 'questao_id'>[],
): Promise<QuestaoWithDetails> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'questoes'), { ...questaoData, created_at: now, updated_at: now })
  const questaoId = ref.id

  const [opRefs, imgRefs] = await Promise.all([
    Promise.all(
      opcoes.map((op, i) =>
        addDoc(collection(db, 'questoes', questaoId, 'opcoes'), { ...op, questao_id: questaoId, ordem: i }),
      ),
    ),
    Promise.all(
      imagens.map((img, i) =>
        addDoc(collection(db, 'questoes', questaoId, 'imagens'), {
          ...img,
          questao_id: questaoId,
          ordem: i,
          created_at: now,
        }),
      ),
    ),
  ])

  return fetchQuestaoWithDetails(db, questaoId)
}

export async function updateQuestao(
  db: Firestore,
  id: string,
  questaoData: Partial<QuestaoInsert>,
  opcoes: Omit<QuestaoOpcaoInsert, 'questao_id'>[],
  imagens: Omit<QuestaoImagemInsert, 'questao_id'>[],
): Promise<QuestaoWithDetails> {
  const now = new Date().toISOString()
  await updateDoc(doc(db, 'questoes', id), { ...questaoData, updated_at: now })

  // Replace opcoes and imagens
  const [opSnap, imgSnap] = await Promise.all([
    getDocs(collection(db, 'questoes', id, 'opcoes')),
    getDocs(collection(db, 'questoes', id, 'imagens')),
  ])
  await Promise.all([
    ...opSnap.docs.map((d) => deleteDoc(d.ref)),
    ...imgSnap.docs.map((d) => deleteDoc(d.ref)),
  ])
  await Promise.all([
    ...opcoes.map((op, i) =>
      addDoc(collection(db, 'questoes', id, 'opcoes'), { ...op, questao_id: id, ordem: i }),
    ),
    ...imagens.map((img, i) =>
      addDoc(collection(db, 'questoes', id, 'imagens'), { ...img, questao_id: id, ordem: i, created_at: now }),
    ),
  ])

  return fetchQuestaoWithDetails(db, id)
}

export async function deleteQuestao(db: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(db, 'questoes', id))
}

export async function listQuestoesDisponiveis(
  db: Firestore,
  opts?: { categoriaId?: string; search?: string; excludeSimuladoId?: string },
): Promise<Questao[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]
  if (opts?.categoriaId) constraints.push(where('categoria_id', '==', opts.categoriaId))

  const snap = await getDocs(query(collection(db, 'questoes'), ...constraints))
  let questoes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Questao)

  if (opts?.search) {
    const s = opts.search.toLowerCase()
    questoes = questoes.filter((q) =>
      q.id.toLowerCase().includes(s) ||
      q.enunciado?.toLowerCase().includes(s),
    )
  }

  if (opts?.excludeSimuladoId) {
    const linkedSnap = await getDocs(
      collection(db, 'simulado_config', opts.excludeSimuladoId, 'questoes'),
    )
    const linkedIds = new Set(linkedSnap.docs.map((d) => d.data().questao_id as string))
    questoes = questoes.filter((q) => !linkedIds.has(q.id))
  }

  return questoes
}

// ── Error Reports ──────────────────────────────────────────────────

export async function listErroReports(
  db: Firestore,
  opts?: { questaoId?: string; status?: StatusErroReport },
): Promise<QuestaoErroReportWithDetails[]> {
  const constraints: Parameters<typeof query>[1][] = [orderBy('created_at', 'desc')]
  if (opts?.questaoId) constraints.push(where('questao_id', '==', opts.questaoId))
  if (opts?.status) constraints.push(where('status', '==', opts.status))

  const snap = await getDocs(query(collection(db, 'questao_erro_reports'), ...constraints))

  return Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as QuestaoErroReport
      const [qSnap, rSnap] = await Promise.all([
        getDoc(doc(db, 'questoes', data.questao_id)),
        data.reportado_por ? getDoc(doc(db, 'users', data.reportado_por)) : Promise.resolve(null),
      ])
      return {
        ...data,
        id: d.id,
        questao: { enunciado: (qSnap.data()?.enunciado ?? '') as string },
        reporter: rSnap?.exists()
          ? { full_name: rSnap.data()!.full_name as string, email: rSnap.data()!.email as string }
          : null,
      }
    }),
  )
}

export async function listPendingErroReportCounts(
  db: Firestore,
): Promise<Record<string, number>> {
  const snap = await getDocs(
    query(collection(db, 'questao_erro_reports'), where('status', '==', 'pendente')),
  )
  const counts: Record<string, number> = {}
  for (const d of snap.docs) {
    const qid = d.data().questao_id as string
    counts[qid] = (counts[qid] ?? 0) + 1
  }
  return counts
}

export async function createErroReport(
  db: Firestore,
  data: QuestaoErroReportInsert,
): Promise<QuestaoErroReport> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'questao_erro_reports'), { ...data, created_at: now, updated_at: now })
  const snap = await getDoc(ref)
  return { id: snap.id, ...snap.data() } as QuestaoErroReport
}

export async function updateErroReport(
  db: Firestore,
  id: string,
  status: StatusErroReport,
): Promise<void> {
  await updateDoc(doc(db, 'questao_erro_reports', id), {
    status,
    updated_at: new Date().toISOString(),
  })
}
