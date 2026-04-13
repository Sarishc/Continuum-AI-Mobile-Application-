import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

// ─── Error handling helper ─────────────────────────────────────────────────────

function handleFirestoreError(error: any): never {
  if (error?.code === 'permission-denied') {
    console.error('Firestore permission denied — check rules:', error);
    throw new Error('Permission denied. Please sign in again.');
  }
  if (error?.code === 'unavailable') {
    throw new Error('No internet connection.');
  }
  throw error;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  return uid;
}

function convertTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}

// ─── Health Profile ───────────────────────────────────────────────────────────

export interface FirestoreHealthProfile {
  userId: string;
  conditions: string[];
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  allergies: string[];
  age: number | null;
  sex: string | null;
  updatedAt?: any;
  createdAt?: any;
}

export async function getHealthProfile(): Promise<FirestoreHealthProfile> {
  try {
    const uid = getCurrentUserId();
    const docRef = doc(db, 'healthProfiles', uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      const empty: FirestoreHealthProfile = {
        userId: uid,
        conditions: [],
        medications: [],
        allergies: [],
        age: null,
        sex: null,
      };
      await setDoc(docRef, {
        ...empty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return empty;
    }

    return { userId: uid, ...(snap.data() as Omit<FirestoreHealthProfile, 'userId'>) };
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function updateHealthProfile(
  data: Partial<Omit<FirestoreHealthProfile, 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const uid = getCurrentUserId();
    const docRef = doc(db, 'healthProfiles', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error);
  }
}

// ─── Health Entries ───────────────────────────────────────────────────────────

export interface FirestoreHealthEntry {
  id: string;
  userId: string;
  entryType: 'lab' | 'symptom' | 'report' | 'note' | 'vitals';
  title: string;
  rawText: string;
  structuredData: {
    conditions: string[];
    medications: string[];
    symptoms: string[];
    labValues: Record<string, string>;
    summary: string;
    riskFlags: string[];
  };
  sourceFile: string | null;
  createdAt: string;
}

export async function getHealthEntries(): Promise<FirestoreHealthEntry[]> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'healthEntries'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreHealthEntry, 'id' | 'createdAt'>),
      createdAt: convertTimestamp(d.data().createdAt),
    }));
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function addHealthEntry(entry: {
  entryType: string;
  title: string;
  rawText: string;
  structuredData: object;
  sourceFile?: string | null;
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const docRef = await addDoc(collection(db, 'healthEntries'), {
      ...entry,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function deleteHealthEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'healthEntries', entryId));
  } catch (error) {
    handleFirestoreError(error);
  }
}

export function subscribeToHealthEntries(
  callback: (entries: FirestoreHealthEntry[]) => void
): () => void {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'healthEntries'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreHealthEntry, 'id' | 'createdAt'>),
      createdAt: convertTimestamp(d.data().createdAt),
    }));
    callback(entries);
  });
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface FirestoreInsight {
  id: string;
  userId: string;
  insightText: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  isRead: boolean;
  confidenceScore: number;
  specialist: { type: string; urgency: string; reason: string } | null;
  createdAt: string;
}

export async function getInsights(): Promise<FirestoreInsight[]> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'insights'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreInsight, 'id' | 'createdAt'>),
      createdAt: convertTimestamp(d.data().createdAt),
    }));
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function addInsight(insight: {
  insightText: string;
  severity: string;
  category: string;
  confidenceScore: number;
  specialist?: object | null;
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const docRef = await addDoc(collection(db, 'insights'), {
      ...insight,
      userId: uid,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function markInsightRead(insightId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'insights', insightId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function markAllInsightsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'insights'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { isRead: true })));
  } catch (error) {
    handleFirestoreError(error);
  }
}

export function subscribeToInsights(
  callback: (insights: FirestoreInsight[]) => void
): () => void {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'insights'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (snap) => {
    const insights = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FirestoreInsight, 'id' | 'createdAt'>),
      createdAt: convertTimestamp(d.data().createdAt),
    }));
    callback(insights);
  });
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<any[]> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: convertTimestamp(d.data().createdAt),
      updatedAt: convertTimestamp(d.data().updatedAt),
    }));
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function saveConversation(
  conversationId: string | null,
  messages: any[]
): Promise<string> {
  try {
    const uid = getCurrentUserId();
    if (conversationId) {
      await updateDoc(doc(db, 'conversations', conversationId), {
        messages,
        updatedAt: serverTimestamp(),
      });
      return conversationId;
    }
    const docRef = await addDoc(collection(db, 'conversations'), {
      userId: uid,
      messages,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export async function getHealthScore(): Promise<number> {
  try {
    const [entries, insights] = await Promise.all([
      getHealthEntries(),
      getInsights(),
    ]);
    const score = calculateHealthScore(entries, insights);

    // Persist snapshot asynchronously (best-effort)
    if (score > 0) saveHealthScoreSnapshot(score).catch(() => {});

    return score;
  } catch {
    return 72;
  }
}

export function calculateHealthScore(entries: any[], insights: any[]): number {
  if (entries.length === 0 && insights.length === 0) return 0;

  let score = 85;

  const unreadCritical = insights.filter((i) => i.severity === 'critical' && !i.isRead).length;
  const unreadHigh     = insights.filter((i) => i.severity === 'high' && !i.isRead).length;
  const unreadMedium   = insights.filter(
    (i) => (i.severity === 'medium' || i.severity === 'moderate') && !i.isRead
  ).length;

  score -= unreadCritical * 15;
  score -= unreadHigh     * 7;
  score -= unreadMedium   * 3;

  // Consistency bonus: entries in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const last7 = entries.filter((e) => new Date(e.createdAt) > weekAgo).length;
  if (last7 >= 3) score += 3;
  if (last7 >= 7) score += 5;

  return Math.max(15, Math.min(98, score));
}

export async function saveHealthScoreSnapshot(score: number): Promise<void> {
  try {
    const uid = getCurrentUserId();
    await addDoc(collection(db, 'healthScores'), {
      userId: uid,
      score,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-critical — never throw
  }
}

// ─── CONSULTATIONS ────────────────────────────────────────────────────────────

export interface DoctorResponse {
  doctorName: string;
  credentials: string;
  response: string;
  recommendations: string[];
  urgencyLevel: 'routine' | 'follow_up' | 'urgent';
  followUpIn: string;
  respondedAt: string;
}

export interface Consultation {
  id: string;
  userId: string;
  status: 'pending' | 'in_review' | 'completed';
  insightId: string;
  insightText: string;
  healthProfile: object;
  recentEntries: any[];
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentAmount: number;
  createdAt: string;
  completedAt: string | null;
  doctorResponse: DoctorResponse | null;
}

export async function createConsultation(data: {
  insightId: string;
  insightText: string;
  healthProfile: object;
  recentEntries: any[];
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const docRef = await addDoc(collection(db, 'consultations'), {
      ...data,
      userId: uid,
      status: 'pending',
      paymentStatus: 'paid',
      paymentAmount: 2900,
      doctorResponse: null,
      completedAt: null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getConsultations(): Promise<Consultation[]> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'consultations'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: convertTimestamp(d.data().createdAt),
      completedAt: d.data().completedAt ? convertTimestamp(d.data().completedAt) : null,
    })) as Consultation[];
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getConsultation(id: string): Promise<Consultation | null> {
  try {
    const snap = await getDoc(doc(db, 'consultations', id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...snap.data(),
      createdAt: convertTimestamp(snap.data().createdAt),
      completedAt: snap.data().completedAt ? convertTimestamp(snap.data().completedAt) : null,
    } as Consultation;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export function subscribeToConsultation(
  consultationId: string,
  callback: (consultation: Consultation | null) => void
) {
  return onSnapshot(doc(db, 'consultations', consultationId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({
      id: snap.id,
      ...snap.data(),
      createdAt: convertTimestamp(snap.data().createdAt),
      completedAt: snap.data().completedAt ? convertTimestamp(snap.data().completedAt) : null,
    } as Consultation);
  });
}

export function subscribeToConsultations(
  callback: (consultations: Consultation[]) => void
) {
  const uid = getCurrentUserId();
  const q = query(
    collection(db, 'consultations'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: convertTimestamp(d.data().createdAt),
        completedAt: d.data().completedAt ? convertTimestamp(d.data().completedAt) : null,
      })) as Consultation[]
    );
  });
}

export async function updateConsultationResponse(
  consultationId: string,
  response: DoctorResponse
): Promise<void> {
  try {
    await updateDoc(doc(db, 'consultations', consultationId), {
      status: 'completed',
      doctorResponse: response,
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error);
  }
}

// ─── MEDICATION SCHEDULES & LOGS ─────────────────────────────────────────────

export const MED_COLORS = [
  '#4C8DFF', '#30D158', '#FF9F0A',
  '#BF5AF2', '#FF453A', '#64D2FF',
];

export interface MedicationSchedule {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times' | 'as_needed';
  times: string[];
  isActive: boolean;
  startDate: string;
  color: string;
  notificationsEnabled: boolean;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  userId: string;
  scheduleId: string;
  medicationName: string;
  scheduledTime: string;
  scheduledDate: string;
  takenAt: string | null;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  note: string | null;
  createdAt: string;
}

export interface AdherenceStats {
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  adherenceRate: number;
  currentStreak: number;
  longestStreak: number;
  last30Days: Array<{
    date: string;
    scheduled: number;
    taken: number;
    rate: number;
  }>;
}

export async function getMedicationSchedules(): Promise<MedicationSchedule[]> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'medicationSchedules'),
      where('userId', '==', uid),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: convertTimestamp(d.data().createdAt),
    })) as MedicationSchedule[];
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function createMedicationSchedule(data: {
  medicationName: string;
  dosage: string;
  frequency: MedicationSchedule['frequency'];
  times: string[];
  notificationsEnabled: boolean;
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const existing = await getMedicationSchedules();
    const color = MED_COLORS[existing.length % MED_COLORS.length];
    const docRef = await addDoc(collection(db, 'medicationSchedules'), {
      ...data,
      userId: uid,
      isActive: true,
      color,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function updateMedicationSchedule(
  scheduleId: string,
  data: Partial<MedicationSchedule>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'medicationSchedules', scheduleId), data as any);
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function deleteMedicationSchedule(scheduleId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'medicationSchedules', scheduleId), { isActive: false });
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getTodaysMedicationLogs(): Promise<MedicationLog[]> {
  try {
    const uid = getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'medicationLogs'),
      where('userId', '==', uid),
      where('scheduledDate', '==', today)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: convertTimestamp(d.data().createdAt),
    })) as MedicationLog[];
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getMedicationLogs(daysBack = 30): Promise<MedicationLog[]> {
  try {
    const uid = getCurrentUserId();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startStr = startDate.toISOString().split('T')[0];
    const q = query(
      collection(db, 'medicationLogs'),
      where('userId', '==', uid),
      where('scheduledDate', '>=', startStr),
      orderBy('scheduledDate', 'desc'),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: convertTimestamp(d.data().createdAt),
    })) as MedicationLog[];
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function logMedicationTaken(data: {
  scheduleId: string;
  medicationName: string;
  scheduledTime: string;
  scheduledDate: string;
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'medicationLogs'),
      where('userId', '==', uid),
      where('scheduleId', '==', data.scheduleId),
      where('scheduledDate', '==', data.scheduledDate),
      where('scheduledTime', '==', data.scheduledTime)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, {
        status: 'taken',
        takenAt: new Date().toISOString(),
      });
      return existing.docs[0].id;
    }
    const docRef = await addDoc(collection(db, 'medicationLogs'), {
      ...data,
      userId: uid,
      status: 'taken',
      takenAt: new Date().toISOString(),
      note: null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export function calculateAdherenceStats(
  _schedules: MedicationSchedule[],
  logs: MedicationLog[]
): AdherenceStats {
  const totalScheduled = logs.length;
  const totalTaken = logs.filter((l) => l.status === 'taken').length;
  const totalMissed = logs.filter((l) => l.status === 'missed').length;
  const adherenceRate =
    totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

  // Build per-day map
  const logsByDate = new Map<string, MedicationLog[]>();
  logs.forEach((l) => {
    logsByDate.set(l.scheduledDate, [...(logsByDate.get(l.scheduledDate) ?? []), l]);
  });

  // Streak calculation
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const sortedDates = Array.from(logsByDate.keys()).sort().reverse();
  let streakBroken = false;

  for (const date of sortedDates) {
    const dayLogs = logsByDate.get(date) ?? [];
    const dayTaken = dayLogs.filter((l) => l.status === 'taken').length;
    const dayTotal = dayLogs.length;
    const ok = dayTotal > 0 && dayTaken / dayTotal >= 0.8;

    if (ok) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      if (!streakBroken) currentStreak = tempStreak;
    } else {
      streakBroken = true;
      tempStreak = 0;
    }
  }

  // Last 30 days breakdown (chronological)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logsByDate.get(dateStr) ?? [];
    const taken = dayLogs.filter((l) => l.status === 'taken').length;
    const scheduled = dayLogs.length;
    return {
      date: dateStr,
      scheduled,
      taken,
      rate: scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0,
    };
  });

  return {
    totalScheduled,
    totalTaken,
    totalMissed,
    adherenceRate,
    currentStreak,
    longestStreak,
    last30Days,
  };
}

export function subscribeToTodaysMeds(callback: (logs: MedicationLog[]) => void) {
  const uid = getCurrentUserId();
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'medicationLogs'),
    where('userId', '==', uid),
    where('scheduledDate', '==', today)
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: convertTimestamp(d.data().createdAt),
      })) as MedicationLog[]
    );
  });
}

// ─── FAMILY GROUPS ────────────────────────────────────────────────────────────

const AVATAR_COLORS_FAMILY = [
  '#4C8DFF', '#30D158', '#FF9F0A',
  '#BF5AF2', '#FF453A', '#64D2FF',
];

export interface FamilyMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'member' | 'caregiver' | 'dependent';
  permissions: {
    canViewHealthScore: boolean;
    canViewInsights: boolean;
    canViewMedications: boolean;
    canViewTimeline: boolean;
    canAddEntries: boolean;
  };
  status: 'active' | 'invited' | 'pending';
  joinedAt: string | null;
  avatarColor: string;
  healthScore?: number;
  lastActive?: string;
}

export interface FamilyGroup {
  id: string;
  ownerId: string;
  name: string;
  members: FamilyMember[];
  planType: 'family' | 'caregiver';
  maxMembers: number;
  createdAt: string;
}

function getDefaultPermissions(role: FamilyMember['role']): FamilyMember['permissions'] {
  switch (role) {
    case 'owner':
    case 'caregiver':
      return {
        canViewHealthScore: true,
        canViewInsights: true,
        canViewMedications: true,
        canViewTimeline: true,
        canAddEntries: true,
      };
    case 'member':
      return {
        canViewHealthScore: true,
        canViewInsights: true,
        canViewMedications: false,
        canViewTimeline: false,
        canAddEntries: false,
      };
    case 'dependent':
      return {
        canViewHealthScore: true,
        canViewInsights: false,
        canViewMedications: false,
        canViewTimeline: false,
        canAddEntries: false,
      };
  }
}

export async function getFamilyGroup(): Promise<FamilyGroup | null> {
  try {
    const uid = getCurrentUserId();
    const ownedQuery = query(
      collection(db, 'familyGroups'),
      where('ownerId', '==', uid),
      limit(1)
    );
    const ownedSnap = await getDocs(ownedQuery);
    if (!ownedSnap.empty) {
      return {
        id: ownedSnap.docs[0].id,
        ...ownedSnap.docs[0].data(),
        createdAt: convertTimestamp(ownedSnap.docs[0].data().createdAt),
      } as FamilyGroup;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function createFamilyGroup(data: {
  name: string;
  planType: 'family' | 'caregiver';
  ownerName: string;
  ownerEmail: string;
}): Promise<string> {
  try {
    const uid = getCurrentUserId();
    const docRef = await addDoc(collection(db, 'familyGroups'), {
      ownerId: uid,
      name: data.name,
      planType: data.planType,
      maxMembers: data.planType === 'caregiver' ? 6 : 4,
      members: [
        {
          userId: uid,
          name: data.ownerName,
          email: data.ownerEmail,
          role: 'owner',
          permissions: getDefaultPermissions('owner'),
          status: 'active',
          joinedAt: new Date().toISOString(),
          avatarColor: AVATAR_COLORS_FAMILY[0],
        },
      ],
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function inviteFamilyMember(data: {
  groupId: string;
  email: string;
  name: string;
  role: FamilyMember['role'];
}): Promise<string> {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await addDoc(collection(db, 'familyInvites'), {
      groupId: data.groupId,
      invitedBy: getCurrentUserId(),
      invitedEmail: data.email,
      invitedName: data.name,
      role: data.role,
      code,
      status: 'pending',
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: serverTimestamp(),
    });
    return code;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function acceptFamilyInvite(code: string): Promise<boolean> {
  try {
    const uid = getCurrentUserId();
    const q = query(
      collection(db, 'familyInvites'),
      where('code', '==', code),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;

    const invite = snap.docs[0].data();
    if ((invite.expiresAt as Timestamp).toDate() < new Date()) return false;

    const userSnap = await getDoc(doc(db, 'users', uid));
    const userData = userSnap.data();

    const groupRef = doc(db, 'familyGroups', invite.groupId as string);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return false;

    const group = groupSnap.data();
    const memberCount = (group.members as any[])?.length ?? 0;
    const color = AVATAR_COLORS_FAMILY[memberCount % AVATAR_COLORS_FAMILY.length];

    await updateDoc(groupRef, {
      members: arrayUnion({
        userId: uid,
        name: userData?.name ?? invite.invitedName,
        email: userData?.email ?? invite.invitedEmail,
        role: invite.role,
        permissions: getDefaultPermissions(invite.role as FamilyMember['role']),
        status: 'active',
        joinedAt: new Date().toISOString(),
        avatarColor: color,
      }),
    });

    await updateDoc(snap.docs[0].ref, { status: 'accepted' });
    return true;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export function subscribeToFamilyGroup(
  groupId: string,
  callback: (group: FamilyGroup | null) => void
) {
  return onSnapshot(doc(db, 'familyGroups', groupId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snap.id,
      ...snap.data(),
      createdAt: convertTimestamp(snap.data().createdAt),
    } as FamilyGroup);
  });
}

export async function getMemberHealthSummary(
  memberId: string,
  permissions: FamilyMember['permissions']
): Promise<{
  healthScore: number | null;
  unreadInsights: number;
  lastEntry: string | null;
  medicationAdherence: number | null;
}> {
  const result = {
    healthScore: null as number | null,
    unreadInsights: 0,
    lastEntry: null as string | null,
    medicationAdherence: null as number | null,
  };

  try {
    if (permissions.canViewHealthScore) {
      const scoreQ = query(
        collection(db, 'healthScores'),
        where('userId', '==', memberId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const scoreSnap = await getDocs(scoreQ);
      if (!scoreSnap.empty) result.healthScore = scoreSnap.docs[0].data().score as number;
    }

    if (permissions.canViewInsights) {
      const insightQ = query(
        collection(db, 'insights'),
        where('userId', '==', memberId),
        where('isRead', '==', false)
      );
      const insightSnap = await getDocs(insightQ);
      result.unreadInsights = insightSnap.size;
    }

    if (permissions.canViewTimeline) {
      const entryQ = query(
        collection(db, 'healthEntries'),
        where('userId', '==', memberId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const entrySnap = await getDocs(entryQ);
      if (!entrySnap.empty) {
        result.lastEntry = convertTimestamp(entrySnap.docs[0].data().createdAt);
      }
    }
  } catch {
    // Permission-restricted access fails gracefully
  }

  return result;
}
